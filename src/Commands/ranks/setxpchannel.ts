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
import config from '../../files/config';

export const command: Command = {
    name: 'setxpchannel',
    description: "Set the channel where user earn new xp level message!",
    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,
            description: 'What you want to do?',
            required: true,
            choices: [
                {
                    name: "Remove the module (send xp message on the user's message channel)",
                    value: "off"
                },
                {
                    name: 'Power on the module (send xp message on a specific channel)',
                    value: "on"
                }
            ],
        },
        {
            name: 'channel',
            type: ApplicationCommandOptionType.Channel,
            description: 'The specific channel for xp message !',
            required: false
        }
    ],
    category: 'ranks',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        let type = interaction.options.getString("action");
        let argsid = interaction.options.getChannel("channel");

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: data.setxpchannels_not_admin });
        }
        if (type === "on") {
            if (!argsid) return interaction.reply({ content: data.setxpchannels_valid_channel_message });

            try {
                const logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setxpchannels_logs_embed_title_enable)
                    .setDescription(data.setxpchannels_logs_embed_description_enable.replace(/\${interaction\.user.id}/g, interaction.user.id)
                        .replace(/\${argsid}/g, argsid.id))

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };
            try {
                let already = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels` })
                if (already === argsid.id) return interaction.reply({ content: data.setxpchannels_already_with_this_config });

                interaction.client.channels.cache.get(argsid.id)?.send({ content: data.setxpchannels_confirmation_message })
                await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels`, value: argsid.id });

                return interaction.reply({ content: data.setxpchannels_command_work_enable.replace(/\${argsid}/g, argsid.id) });

            } catch (e) {
                interaction.reply({ content: data.setxpchannels_command_error_enable });
            }

        };
        
        if (type == "off") {
            try {
                const logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setxpchannels_logs_embed_title_disable)
                    .setDescription(data.setxpchannels_logs_embed_description_disable.replace(/\${interaction\.user.id}/g, interaction.user.id))

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };
            try {
                let already2 = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels` });

                if (already2 === "off") return interaction.reply({content: data.setxpchannels_already_disabled_disable});

                await db.DataBaseModel({ id: db.Delete, key: `${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels` });
                return interaction.reply({ content: data.setxpchannels_command_work_disable });
            } catch (e) {
                return await interaction.reply({content: data.setxpchannels_command_error_disable});
            }
        }
    },
}