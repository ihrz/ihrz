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
    name: 'reroll',
    description: 'Reroll a giveaway winner(s)!',
    options: [
        {
            name: 'giveaway-id',
            type: ApplicationCommandOptionType.String,
            description: 'The giveaway id (is the message id of the embed\'s giveaways)',
            required: true
        }
    ],
    category: 'giveaway',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        const inputData = interaction.options.getString("giveaway-id");

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: data.reroll_not_perm });
        }

        const giveaway =
            client.giveawaysManager.giveaways.find((g) => g.guildId === interaction.guild.id && g.prize === inputData) ||
            client.giveawaysManager.giveaways.find((g) => g.guildId === interaction.guild.id && g.messageId === inputData);
        if (!giveaway) {
            return interaction.reply({
                content: data.reroll_dont_find_giveaway
                    .replace("{args}", inputData)
            });
        }

        client.giveawaysManager
            .reroll(giveaway.messageId)
            .then(() => {
                interaction.reply({ content: data.reroll_command_work });
                try {
                    let logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.reroll_logs_embed_title)
                        .setDescription(data.reroll_logs_embed_description
                            .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                            .replace(/\${giveaway\.messageID}/g, giveaway.messageId)
                        )

                    let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                } catch (e: any) { logger.err(e) };
            })
            .catch((error) => {
                if (error.startsWith(`Giveaway with message Id ${giveaway.messageId} is not ended.`)) { interaction.reply({ content: `This giveaway is not over!` }); }
                else { interaction.reply({ content: data.reroll_command_error }); }
            });
    },
};