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
    Client,
    EmbedBuilder,
    ChatInputCommandInteraction,
    Message,
    User,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    AttachmentBuilder,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { Command, SubCommand } from '../../../../types/command.js';
import { formatNumber } from '../../../core/functions/numberBeautifuer.js';

export const subCommand: SubCommand = {
    run: async (
        client: Client,
        interaction: ChatInputCommandInteraction<"cached"> | Message,
        lang: LanguageData,
        args?: string[]
    ) => {
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (await client.db.get(`${interaction.guildId}.ECONOMY.disabled`) === true) {
            await client.method.interactionSend(interaction, {
                content: lang.economy_disable_msg
                    .replace('${interaction.user.id}', interaction.member.user.id)
            });
            return;
        }

        let char = await client.db.get(`${interaction.guildId}.USER`) as DatabaseStructure.DbGuildUserObject;
        let array: { user: User; totalWealth: number; bank: number; money: number; }[] = [];

        for (let i in char) {
            let user = interaction.client.users.cache.get(i);
            let economy = char[i].ECONOMY;
            if (!user || !economy) continue;
            array.push({
                user: user,
                totalWealth: (economy.bank || 0) + (economy.money || 0),
                bank: economy.bank || 0,
                money: economy.money || 0
            });
        }

        if (array.length === 0) {
            await client.method.interactionSend(interaction, {
                content: lang.perm_list_no_user
            });
            return;
        }

        var htmlContent = client.htmlfiles["podiumEconomyModule"];

        array.sort((a, b) => b.totalWealth - a.totalWealth);

        const itemsPerPage = 10;
        const totalPages = Math.ceil(array.length / itemsPerPage);

        htmlContent = htmlContent
            .replaceAll("{title}", lang.economy_leaderboard_embed_title.replace('`${interaction.guild.name}`', interaction.guild.name + " "))
            .replaceAll('{1_username}', array[0]?.user.username || lang.profil_unknown)
            .replaceAll('{2_username}', array[1]?.user.username || lang.profil_unknown)
            .replaceAll('{3_username}', array[2]?.user.username || lang.profil_unknown)
            .replaceAll('{1_wealth}', formatNumber(array[0]?.totalWealth || 0))
            .replaceAll('{2_wealth}', formatNumber(array[1]?.totalWealth || 0))
            .replaceAll('{3_wealth}', formatNumber(array[2]?.totalWealth || 0))
            .replaceAll('{1_avatar}', array[0]?.user.avatarURL({ extension: 'png', size: 128 }) || "https://ihorizon.me/assets/img/unknown-user.png")
            .replaceAll('{2_avatar}', array[1]?.user.avatarURL({ extension: 'png', size: 128 }) || "https://ihorizon.me/assets/img/unknown-user.png")
            .replaceAll('{3_avatar}', array[2]?.user.avatarURL({ extension: 'png', size: 128 }) || "https://ihorizon.me/assets/img/unknown-user.png")
            .replaceAll('{coin_emoji}', client.iHorizon_Emojis.icon.Coin);

        const createEmbed = (page: number) => {
            const startIndex = page * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageUsers = array.slice(startIndex, endIndex);

            const embed = new EmbedBuilder()
                .setTitle(lang.economy_leaderboard_embed_title.replace('${interaction.guild.name}', interaction.guild!.name))
                .setColor('#ffd700')
                .setImage("attachment://image.png")
                .setDescription(
                    pageUsers.map((entry, index) => {
                        const globalIndex = startIndex + index;
                        const medal = globalIndex === 0 ? '🥇' : globalIndex === 1 ? '🥈' : globalIndex === 2 ? '🥉' : '💰';

                        return `${medal} **${globalIndex + 1}** ・ ${entry.user?.toString()}\n  ┖ ${client.iHorizon_Emojis.icon.Coin} **${formatNumber(entry.bank)}** (${lang.balance_embed_fields1_name}) + **${formatNumber(entry.money)}** (${lang.balance_embed_fields2_name})`;
                    }).join('\n')
                )
                .setFooter({
                    text: lang.prevnames_embed_footer_text
                        .replace("${currentPage + 1}", String(page + 1))
                        .replace("${pages.length}", String(totalPages)),
                    iconURL: "attachment://footer_icon.png"
                })
                .setTimestamp();

            return embed;
        };

        const image = await client.method.imageManipulation.html2Png(htmlContent, {
            elementSelector: 'body',
            omitBackground: true,
            selectElement: false,
            width: 1024,
            height: 512
        });

        const attachment = new AttachmentBuilder(image, { name: 'image.png' });

        const createButtons = (currentPage: number) => {
            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('first')
                        .setLabel('<<')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('<')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('page_info')
                        .setLabel(`${lang.var_page} ${currentPage + 1}/${totalPages}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('>')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === totalPages - 1),
                    new ButtonBuilder()
                        .setCustomId('last')
                        .setLabel('>>')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === totalPages - 1)
                );

            return row;
        };

        let currentPage = 0;

        const message = await client.method.interactionSend(interaction, {
            embeds: [createEmbed(currentPage)],
            components: [createButtons(currentPage)],
            files: [await client.method.bot.footerAttachmentBuilder(interaction), attachment]
        });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on('collect', async (buttonInteraction) => {
            if (!buttonInteraction.isButton()) return;

            switch (buttonInteraction.customId) {
                case 'first': currentPage = 0; break;
                case 'previous': if (currentPage > 0) currentPage--; break;
                case 'next': if (currentPage < totalPages - 1) currentPage++; break;
                case 'last': currentPage = totalPages - 1; break;
            }

            await buttonInteraction.update({
                embeds: [createEmbed(currentPage)],
                components: [createButtons(currentPage)]
            });
        });

        collector.on('end', async () => {
            await message.edit({
                components: [
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('first')
                                .setLabel('<<')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('previous')
                                .setLabel('<')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('page_info')
                                .setLabel(`${lang.var_page} ${currentPage + 1}/${totalPages}`)
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('next')
                                .setLabel('>')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('last')
                                .setLabel('>>')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true)
                        )
                ]
            });
        });

        return;
    },
};