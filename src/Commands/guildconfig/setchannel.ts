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
    name: 'setchannel',
    description: 'Set the channel where the bot will send message when user leave/join guild!',
    options: [
        {
            name: 'type',
            type: ApplicationCommandOptionType.String,
            description: '<On join/On leave/Delete all settings>',
            required: true,
            choices: [
                {
                    name: "On join",
                    value: "join"
                },
                {
                    name: "On leave",
                    value: "leave"
                },
                {
                    name: "Delete all settings",
                    value: "off"
                }
            ]
        },
        {
            name: 'channel',
            type: ApplicationCommandOptionType.Channel,
            description: "The channel you wan't your welcome/goodbye message !",
            required: false
        }
    ],
    category: 'guildconfig',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: data.setchannels_not_admin });
        }

        let type = interaction.options.getString("type");
        let argsid = interaction.options.getChannel("channel");

        if (type === "join") {
            if (!argsid) return interaction.reply({ content: data.setchannels_not_specified_args })

            try {
                const logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setchannels_logs_embed_title_on_join)
                    .setDescription(data.setchannels_logs_embed_description_on_join
                        .replace(/\${argsid\.id}/g, argsid.id)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };

            try {
                let already = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.join` })
                if (already === argsid.id) return interaction.reply({ content: data.setchannels_already_this_channel_on_join })
                interaction.client.channels.cache.get(argsid.id).send({ content: data.setchannels_confirmation_message_on_join })
                await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.join`, value: argsid.id })

                return interaction.reply({
                    content: data.setchannels_command_work_on_join
                        .replace(/\${argsid\.id}/g, argsid.id)
                });
            } catch (e) {
                interaction.reply({ content: data.setchannels_command_error_on_join });
            }
        }

        if (type === "leave") {
            try {
                if (!argsid) return interaction.reply({ content: data.setchannels_not_specified_args });
                let already = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leave` });

                if (already === argsid.id) return interaction.reply({ content: data.setchannels_already_this_channel_on_leave })
                interaction.client.channels.cache.get(argsid.id)?.send({ content: data.setchannels_confirmation_message_on_leave })
                await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leave`, value: argsid.id });

                try {
                    const logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.setchannels_logs_embed_title_on_leave)
                        .setDescription(data.setchannels_logs_embed_description_on_leave
                            .replace(/\${argsid\.id}/g, argsid.id)
                            .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        )

                    let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                } catch (e: any) { logger.err(e) };

                return interaction.reply({
                    content: data.setchannels_command_work_on_leave
                        .replace(/\${argsid\.id}/g, argsid.id)
                });

            } catch (e) {
                return interaction.reply({ content: data.setchannels_command_error_on_leave });
            }
        }
        if (type === "off") {
            try {
                const logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setchannels_logs_embed_title_on_off)
                    .setDescription(data.setchannels_logs_embed_description_on_off
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) };
            } catch (e: any) { logger.err(e) };

            let leavec: string = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.join` });
            let joinc: string = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leave` });
            if (!joinc && !leavec) return interaction.reply({ content: data.setchannels_already_on_off });

            await db.DataBaseModel({ id: db.Delete, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.join` });
            await db.DataBaseModel({ id: db.Delete, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leave` });
            return interaction.reply({ content: data.setchannels_command_work_on_off });
        }
    },
};