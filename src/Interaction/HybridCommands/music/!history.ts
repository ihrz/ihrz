/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    InteractionEditReplyOptions,
    Message,
    MessagePayload,
    MessageReplyOptions,
    PermissionsBitField,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        let history = await client.db.get(`${interaction.guildId}.MUSIC_HISTORY`);

        if (!history || !history.embed || history.embed.length == 0) {
            await client.method.interactionSend(interaction, { content: lang.history_no_entries });
            return;
        };

        let buffer = Buffer.from(history.buffer.map((content: string) => content).join('\n'), 'utf-8');
        let attachment = new AttachmentBuilder(buffer, { name: 'music_history_by_ihorizon.txt' })

        let currentPage = 0;
        let usersPerPage = 10;
        let pages: { title: string; description: string; }[] = [];

        for (let i = 0; i < history.embed.length; i += usersPerPage) {
            let pageUsers = history.embed.slice(i, i + usersPerPage);
            let pageContent = pageUsers.map((userId: string) => userId).join('\n');

            pages.push({
                title: lang.history_embed_title
                    .replace('${interaction.guild?.name}', interaction.guild.name)
                    .replace('${i / usersPerPage + 1}', (i / usersPerPage + 1).toString()),
                description: pageContent,
            });
        };

        let createEmbed = () => {
            return new EmbedBuilder()
                .setColor('#00cc1a')
                .setTimestamp()
                .setTitle(pages[currentPage].title)
                .setDescription(pages[currentPage].description)
                .setFooter({
                    text: lang.history_embed_footer_text
                        .replace('${currentPage + 1}', (currentPage + 1).toString())
                        .replace('${pages.length}', pages.length.toString()),
                    iconURL: "attachment://footer_icon.png"
                })
                .setTimestamp()
        };

        let row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('previousPage')
                .setLabel('<<')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('nextPage')
                .setLabel('>>')
                .setStyle(ButtonStyle.Secondary),
        );

        let messageEmbed = await client.method.interactionSend(interaction, {
            embeds: [createEmbed()],
            components: [(row as ActionRowBuilder<ButtonBuilder>)],
            files: [attachment, await client.method.bot.footerAttachmentBuilder(interaction)]
        });

        let collector = messageEmbed.createMessageComponentCollector({
            filter: async (i) => {
                await i.deferUpdate();
                return interaction.member?.user.id === i.user.id;
            }, time: 60000
        });

        collector.on('collect', (interaction: { customId: string; }) => {
            if (interaction.customId === 'previousPage') {
                currentPage = (currentPage - 1 + pages.length) % pages.length;
            } else if (interaction.customId === 'nextPage') {
                currentPage = (currentPage + 1) % pages.length;
            }

            messageEmbed.edit({ embeds: [createEmbed()] });
        });

        collector.on('end', () => {
            row.components.forEach((component) => {
                if (component instanceof ButtonBuilder) {
                    component.setDisabled(true);
                }
            });
            messageEmbed.edit({ components: [(row as ActionRowBuilder<ButtonBuilder>)] });
        });

        return;
    },
};