/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

import {
    Client,
    Collection,
    ChannelType,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} from 'discord.js'

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import ms from 'ms';
import config from '../../files/config';

export const command: Command = {
    name: 'start',
    description: 'Start a giveaway!',
    options: [
        {
            name: 'channel',
            type: ApplicationCommandOptionType.Channel,
            description: 'The channels where the giveaways is sent',
            required: true
        },
        {
            name: 'winner',
            type: ApplicationCommandOptionType.Number,
            description: 'Number of winner for the giveaways',
            required: true
        },
        {
            name: 'time',
            type: ApplicationCommandOptionType.String,
            description: 'The time duration of the giveaways',
            required: true
        },
        {
            name: 'prize',
            type: ApplicationCommandOptionType.String,
            description: 'The giveaway\'s prize',
            required: true
        }
    ],
    category: 'giveaway',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: data.start_not_perm });
        };

        let giveawayChannel = interaction.options.getChannel("channel");

        var giveawayDuration: any = interaction.options.getString("time");

        let giveawayNumberWinners = interaction.options.getNumber("winner");

        if (isNaN(giveawayNumberWinners) || (parseInt(giveawayNumberWinners) <= 0)) {
            return interaction.reply({ content: data.start_is_not_valid });
        };

        let giveawayPrize = interaction.options.getString("prize");

        var giveawayDuration: any = ms(giveawayDuration);

        client.giveawaysManager.start(giveawayChannel, {
            duration: giveawayDuration,
            prize: giveawayPrize,
            winnerCount: parseInt(giveawayNumberWinners),
            hostedBy: config.giveaway.hostedBy ? interaction.user : null,
        });

        try {
            let logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.reroll_logs_embed_title)
                .setDescription(data.start_logs_embed_description
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    .replace(/\${giveawayChannel}/g, giveawayChannel)
                );

            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e: any) { logger.err(e) };

        return await interaction.reply({
            content: data.start_confirmation_command
                .replace(/\${giveawayChannel}/g, giveawayChannel)
        });
    },
};