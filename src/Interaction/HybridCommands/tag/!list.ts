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
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ButtonInteraction,
    InteractionResponse,
    MessageEditOptions,
    time
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { generateTagInfoEmbed } from './tag.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        // Fetch tags data
        let baseData = await client.db.get(`${interaction.guildId}.GUILD.TAGS.storedTags`) as DatabaseStructure.GuildTagsStructure["storedTags"] | undefined;

        // Check if there are no tags
        if (!baseData || Object.entries(baseData).length === 0) {
            await client.func.method.interactionSend(interaction, { content: lang.tag_list_no_anything });
            return;
        }

        // Create embeds array
        let arrayEmbeds: EmbedBuilder[][] = [];
        const tags = Object.entries(baseData);

        // Generate embeds for each tag
        for (const [id, info] of tags) {
            let embed = generateTagInfoEmbed(interaction, lang, id, info);

            const embedData = await client.db.get(`EMBED.${info.embedId}`);
            if (embedData) {
                arrayEmbeds.push([embed, embedData.embedSource]);
            } else {
                arrayEmbeds.push([embed]);
            }
        }

        // Initialize pagination
        let currentPage = 0;

        // Create navigation buttons
        const getButtons = (currentPage: number) => {
            return new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('first')
                        .setLabel('◀◀')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('◀')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('page')
                        .setLabel(`${lang.var_page} ${currentPage + 1}/${arrayEmbeds.length}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === arrayEmbeds.length - 1),
                    new ButtonBuilder()
                        .setCustomId('last')
                        .setLabel('▶▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === arrayEmbeds.length - 1)
                );
        };

        // Initial message
        const response = await client.func.method.interactionSend(interaction, {
            embeds: arrayEmbeds[currentPage],
            components: [getButtons(currentPage)]
        });

        // Create collector
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60_000 * 5 // 5 minutes
        });

        collector.on('collect', async (i: ButtonInteraction) => {
            // Verify interaction user
            if (i.user.id !== (interaction instanceof Message ? interaction.author.id : interaction.user.id)) {
                await i.reply({ content: lang.embed_interaction_not_for_you, ephemeral: true });
                return;
            }

            // Handle button interactions
            switch (i.customId) {
                case 'first':
                    currentPage = 0;
                    break;
                case 'previous':
                    currentPage = Math.max(0, currentPage - 1);
                    break;
                case 'next':
                    currentPage = Math.min(arrayEmbeds.length - 1, currentPage + 1);
                    break;
                case 'last':
                    currentPage = arrayEmbeds.length - 1;
                    break;
            }

            // Update message
            await i.update({
                embeds: arrayEmbeds[currentPage],
                components: [getButtons(currentPage)]
            });
        });

        collector.on('end', async () => {
            await response.edit({
                components: []
            });
        });
    }
};