/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} from 'pwss';
import { LanguageData } from '../../../../types/languageData';
import { DatabaseStructure } from '../../../core/database_structure';

const itemsPerPage = 15;

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        let text: string = data.leaderboard_default_text;
        let char = await client.db.get(`${interaction.guildId}.USER`) as DatabaseStructure.DbGuildUserObject;
        let tableau: { invCount: number; text: string; }[] = [];

        for (let key in char) {
            let a = char?.[key]?.INVITES;

            if (a && a.invites && a.invites >= 1) {
                tableau.push({
                    invCount: a.invites,
                    text: data.leaderboard_text_inline
                        .replace("${i}", key)
                        .replace("${a.invites || 0}", String(a.invites || 0))
                        .replace("${a.regular || 0}", String(a.regular || 0))
                        .replace("${a.bonus || 0}", String(a.bonus || 0))
                        .replace("${a.leaves || 0}", String(a.leaves || 0))
                });
            }
        }

        tableau.sort((a, b) => b.invCount - a.invCount);

        const generateEmbed = (start: number) => {
            const current = tableau.slice(start, start + itemsPerPage);
            let pageText = text;
            let i = start + 1;
            current.forEach((index) => {
                pageText += `Top #${i} - ${index.text}\n`;
                i++;
            });

            return new EmbedBuilder()
                .setColor("#FFB6C1")
                .setDescription(pageText)
                .setTimestamp()
                .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                .setThumbnail(interaction.guild?.iconURL() as string);
        };

        const canFitOnOnePage = tableau.length <= itemsPerPage;
        const embedMessage = await interaction.editReply({
            embeds: [generateEmbed(0)],
            components: canFitOnOnePage ? [] : [new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('⬅️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('➡️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(tableau.length <= itemsPerPage)
            )],
            files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
        });

        if (canFitOnOnePage) return;

        const collector = embedMessage.createMessageComponentCollector({ filter: (i) => i.customId === 'previous' || i.customId === 'next', componentType: ComponentType.Button, time: 60000 });

        let currentIndex = 0;
        collector.on('collect', async (i) => {
            if (i.customId === 'previous') {
                currentIndex -= itemsPerPage;
            } else if (i.customId === 'next') {
                currentIndex += itemsPerPage;
            }

            await i.update({
                embeds: [generateEmbed(currentIndex)],
                components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('⬅️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentIndex === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('➡️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentIndex + itemsPerPage >= tableau.length)
                )],
            });
        });

        collector.on('end', () => {
            embedMessage.edit({ components: [] });
        });
    },
};