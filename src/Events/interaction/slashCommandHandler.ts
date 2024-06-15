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

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Client, EmbedBuilder, Interaction } from 'discord.js';
import { BotEvent } from '../../../types/event';
import logger from '../../core/logger.js';
import { LanguageData } from '../../../types/languageData';

var timeout: number = 1000;

async function cooldDown(client: Client, interaction: Interaction) {
    let tn = Date.now();
    let table = client.db.table("TEMP");
    var fetch = await table.get(`COOLDOWN.${interaction.user.id}`);
    if (fetch !== null && timeout - (tn - fetch) > 0) return true;

    await table.set(`COOLDOWN.${interaction.user.id}`, tn);
    return false;
};

export const event: BotEvent = {
    name: "interactionCreate",
    run: async (client: Client, interaction: Interaction) => {

        if (!interaction.isChatInputCommand()
            || interaction.user.bot) return;

        if (interaction.channel?.type === ChannelType.DM) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(2829617)
                        .setImage('https://ihorizon.me/assets/img/banner/ihrz_en-US.png')
                        .setDescription(`# Uhh Oh!!\n\nIt seems you are using iHorizon in a private conversation.\nI want to clarify that iHorizon can only be used in a Discord server!\n\nTo unleash my full potential, add me!`)
                ],
                components: [
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setEmoji(client.iHorizon_Emojis.icon.Crown_Logo)
                                .setLabel('Invite iHorizon')
                                .setStyle(ButtonStyle.Link)
                                .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user?.id}&permissions=8&scope=bot`),
                            new ButtonBuilder()
                                .setEmoji(client.iHorizon_Emojis.icon.Sparkles)
                                .setLabel('iHorizon Website')
                                .setStyle(ButtonStyle.Link)
                                .setURL('https://ihorizon.me'),
                        )
                ]
            })
            return;
        }
        let command = client.commands?.get(interaction.commandName);

        if (!command) {
            return interaction.reply({ content: 'Connection error.', ephemeral: true });
        };

        if (await cooldDown(client, interaction)) {
            let data = await client.functions.getLanguageData(interaction.guild?.id) as LanguageData;

            await interaction.reply({ content: data.Msg_cooldown, ephemeral: true });
            return;
        };

        try {
            if (await client.db.table('BLACKLIST').get(`${interaction.user.id}.blacklisted`)) {
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#0827F5").setTitle(":(")
                            .setImage(client.config.core.blacklistPictureInEmbed)
                    ], ephemeral: true
                });
                return;
            };

            if (command.thinking) {
                await interaction.deferReply();
            };

            await command.run(client, interaction);
        } catch (e: any) {
            // logger.err(e);
            console.error(e)
        };
    },
};