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
    name: 'setjoindm',
    description: 'Set a join dm message when user join the guild!',
    options: [
        {
            name: "value",
            description: "Choose the action you want to do",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                {
                    name: "Power on",
                    value: "on"
                },
                {
                    name: "Power off",
                    value: "off"
                },
                {
                    name: "Show the message set",
                    value: "ls"
                }
            ]
        },
        {
            name: 'message',
            type: ApplicationCommandOptionType.String,
            description: '<Message if the first args is on>',
            required: false
        }
    ],
    category: 'guildconfig',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: data.setjoindm_not_admin });
        }

        let type = interaction.options.getString("value");
        let dm_msg = interaction.options.getString("message");

        if (type === "on") {
            try {
                const logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setjoindm_logs_embed_title_on_enable)
                    .setDescription(data.setjoindm_logs_embed_description_on_enable
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };

            try {
                if (!dm_msg) return interaction.reply({ content: data.setjoindm_not_specified_args_on_enable })
                await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.joindm`, value: dm_msg });
                return interaction.reply({
                    content: data.setjoindm_confirmation_message_on_enable
                        .replace(/\${dm_msg}/g, dm_msg)
                });
            } catch (e) {
                interaction.reply({ content: data.setjoindm_command_error_on_enable });
            }
        }

        if (type === "off") {
            try {
                let ban_embed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setjoindm_logs_embed_title_on_disable)
                    .setDescription(data.setjoindm_logs_embed_description_on_disable
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    )
                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                logchannel.send({ embeds: [ban_embed] })
            } catch (e) {
                return;
            }

            try {
                let already_off = await db.DataBaseModel({ id: db.Get, key: `joindm-${interaction.guild.id}` });
                if (already_off === "off") return interaction.reply({ content: data.setjoindm_already_disable });
                await db.DataBaseModel({ id: db.Delete, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.joindm` });
                return interaction.reply({ content: data.setjoindm_confirmation_message_on_disable });

            } catch (e) {
                interaction.reply({ content: data.setjoindm_command_error_on_disable });
            }
        }
        if (type === "ls") {
            let already_off = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.joindm` });
            if (already_off === null) {
                return interaction.reply({ content: data.setjoindm_not_setup_ls })
            };

            return interaction.reply({
                content: data.setjoindm_command_work_ls
                    .replace(/\${already_off}/g, already_off)
            })
        }
    },
};