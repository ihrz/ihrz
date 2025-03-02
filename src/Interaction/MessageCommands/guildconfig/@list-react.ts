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
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    Message,
    PermissionsBitField
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import { DatabaseStructure } from '../../../../types/database_structure.js'; 
export const command: Command = {

    name: 'list-react',
    aliases: ['react-list', 'listreact', 'reactlist'],

    description: 'Show all specific messages saved to be react',
    description_localizations: {
        "fr": "Afficher tous les messages spécifiques enregistrés pour être réagis"
    },

    thinking: false,
    category: 'guildconfig',
    type: "PREFIX_IHORIZON_COMMAND",
    permission: PermissionsBitField.Flags.AddReactions,
    run: async (client: Client, interaction: Message<true>, lang: LanguageData, options?: string[]) => {

        let all_specific_message: DatabaseStructure.DbGuildObject["REACT_MSG"] = await client.db.get(`${interaction.guildId}.GUILD.REACT_MSG`) || {};

        let currentPage = 0;

        let pages: string[] = [];

        Object.entries(all_specific_message!).forEach(([key, value]) => {
            pages.push(lang.list_react_embed_msg.replace("${key}", key).replace("${value}", value));
        });

        if (pages.length === 0) {
            await interaction.reply({
                content: lang.list_react_nothing_found,
                allowedMentions: { repliedUser: false }
            });
            return;
        }

        let createEmbed = () => {
            return new EmbedBuilder()
                .setColor("#000000")
                .setDescription(pages[currentPage])
                .setFooter({ text: `iHorizon | Page ${currentPage + 1}/${pages.length}`, iconURL: "attachment://footer_icon.png" })
                .setTimestamp()
        };

        let row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('previousPage')
                .setLabel('<<<')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('nextPage')
                .setLabel('>>>')
                .setStyle(ButtonStyle.Secondary),
        );

        let messageEmbed = await interaction.reply({
            embeds: [createEmbed()],
            components: [(row as ActionRowBuilder<ButtonBuilder>)],
            files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
        });

        let collector = messageEmbed.createMessageComponentCollector({
            filter: async (i) => {
                await i.deferUpdate();
                return interaction.author.id === i.user.id;
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
    },
};
