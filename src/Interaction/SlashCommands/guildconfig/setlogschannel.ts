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
    Client,
    EmbedBuilder,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    BaseGuildTextChannel,
    ApplicationCommandType,
    ChannelType,
    PermissionFlagsBits,
} from 'discord.js';

import { Command } from '../../../../types/command.js';
import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';

export const command: Command = {
    name: 'setlogschannel',

    description: 'Set a logs channels for Audits Logs!',
    description_localizations: {
        "fr": "Définir des canaux de journaux pour les journaux d'audit"
    },
    options: [
        {
            name: 'type',
            type: ApplicationCommandOptionType.String,

            description: 'Specified logs category',
            description_localizations: {
                "fr": "Spécifier le cannal de journaux"
            },

            required: true,
            choices: [
                { name: "Delete all settings", value: "off" },
                { name: "Setup all channels", value: "auto" },
                { name: "Roles Logs", value: "1" },
                { name: "Moderation Logs", value: "2" },
                { name: "Voice Logs", value: "3" },
                { name: "Messages Logs", value: "4" },
                { name: "Boost Logs", value: "5" },
                { name: "Ticket Logs", value: "6" },
            ]
        },
        {
            name: 'channel',
            type: ApplicationCommandOptionType.Channel,

            channel_types: [ChannelType.GuildText],

            description: "The channel you want your logs message !",
            description_localizations: {
                "fr": "Le canal sur lequel vous souhaitez recevoir votre message de journaux"
            },

            required: false
        }
    ],
    thinking: true,
    category: 'guildconfig',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setlogschannel_not_admin });
            return;
        };

        let type = interaction.options.getString("type");
        let argsid = interaction.options.getChannel("channel");

        /*                                       AUTOSET LOGS                                               */
        if (type === "auto") {
            let all_created_channels: string[] = [];
            let all_logs_possible = [
                { id: "voice", value: data.setlogschannel_var_voice },
                { id: "moderation", value: data.setlogschannel_var_mods },
                { id: "message", value: data.setlogschannel_var_msg },
                { id: "boosts", value: data.setlogschannel_var_boost },
                { id: "roles", value: data.setlogschannel_var_roles },
                { id: "ticket-log-channel", value: data.setlogschannel_var_tickets },
            ];

            interaction.guild?.channels.create({
                name: "LOGS",
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone,
                        deny: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory
                        ]
                    }
                ],
            }).then(async category => {
                const promises = all_logs_possible.map(async (typeOfLogs) => {
                    const channel = await interaction.guild?.channels.create({
                        name: typeOfLogs.value,
                        parent: category.id,
                        permissionOverwrites: category.permissionOverwrites.cache,
                        type: ChannelType.GuildText
                    });
                    if (channel) {
                        all_created_channels.push(channel.id);
                        (client.channels.cache.get(channel.id) as BaseGuildTextChannel).send({
                            content: data.setlogschannel_confirmation_message
                                .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                                .replace("${interaction.user.id}", interaction.user.id)
                                .replace("${typeOfLogs}", typeOfLogs.value)
                        });
                        if (typeOfLogs.id === 'ticket-log-channel') {
                            await client.db.set(`${interaction.guildId}.GUILD.TICKET.logs`, channel.id);
                        } else {
                            await client.db.set(`${interaction.guildId}.GUILD.SERVER_LOGS.${typeOfLogs.id}`, channel.id);
                        }
                    }
                });
                await Promise.all(promises);
                await interaction.editReply({
                    content: data.setlogschannel_utils_command_work
                        .replace("${argsid.id}", all_created_channels.map(x => `<#${x}>`).join(',').toString())
                        .replace("${typeOfLogs}", all_logs_possible.map(x => x.value).join(', '))
                });
                return;
            })
        };

        /*                                        ROLES LOGS                                                */
        if (type === "1") {
            let typeOfLogs = data.setlogschannel_var_roles;
            if (!argsid) {
                await interaction.editReply({ content: data.setlogschannel_not_specified_args });
                return;
            };
            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setlogschannel_logs_embed_title)
                    .setDescription(data.setlogschannel_logs_embed_description_on_enable
                        .replace(/\${argsid\.id}/g, argsid.id)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace(/\${typeOfLogs}/g, typeOfLogs)
                    );

                let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) };
            } catch (e: any) { logger.err(e) };

            try {
                let already = await client.db.get(`${interaction.guildId}.GUILD.SERVER_LOGS.roles`);

                if (already === argsid.id) {
                    await interaction.editReply({ content: data.setlogschannel_already_this_channel });
                    return;
                };

                (client.channels.cache.get(argsid.id) as BaseGuildTextChannel).send({
                    content: data.setlogschannel_confirmation_message
                        .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                })
                await client.db.set(`${interaction.guildId}.GUILD.SERVER_LOGS.roles`, argsid.id);

                await interaction.editReply({
                    content: data.setlogschannel_command_work
                        .replace("${argsid.id}", argsid.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                });
                return;
            } catch (e) {
                await interaction.editReply({ content: data.setlogschannel_command_error });
                return;
            };
        };

        /*                                        MODERATION LOGS                                                */
        if (type === "2") {
            let typeOfLogs = data.setlogschannel_var_mods;
            if (!argsid) {
                await interaction.editReply({ content: data.setlogschannel_not_specified_args });
                return;
            };

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setlogschannel_logs_embed_title)
                    .setDescription(data.setlogschannel_logs_embed_description_on_enable
                        .replace(/\${argsid\.id}/g, argsid.id)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace(/\${typeOfLogs}/g, typeOfLogs)
                    )

                let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };

            try {
                let already = await client.db.get(`${interaction.guildId}.GUILD.SERVER_LOGS.moderation`);

                if (already === argsid.id) {
                    await interaction.editReply({ content: data.setlogschannel_already_this_channel });
                    return;
                };

                (client.channels.cache.get(argsid.id) as BaseGuildTextChannel).send({
                    content: data.setlogschannel_confirmation_message
                        .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                })
                await client.db.set(`${interaction.guildId}.GUILD.SERVER_LOGS.moderation`, argsid.id);

                await interaction.editReply({
                    content: data.setlogschannel_command_work
                        .replace("${argsid.id}", argsid.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                });
                return;
            } catch (e) {
                await interaction.editReply({ content: data.setlogschannel_command_error });
                return;
            };
        };

        /*                                        VOICES LOGS                                                */
        if (type === "3") {
            let typeOfLogs = data.setlogschannel_var_voice;

            if (!argsid) {
                await interaction.editReply({ content: data.setlogschannel_not_specified_args });
                return;
            };

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setlogschannel_logs_embed_title)
                    .setDescription(data.setlogschannel_logs_embed_description_on_enable
                        .replace(/\${argsid\.id}/g, argsid.id)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace(/\${typeOfLogs}/g, typeOfLogs)
                    )

                let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };

            try {
                let already = await client.db.get(`${interaction.guildId}.GUILD.SERVER_LOGS.voice`);
                if (already === argsid.id) {
                    await interaction.editReply({ content: data.setlogschannel_already_this_channel });
                    return;
                };

                (client.channels.cache.get(argsid.id) as BaseGuildTextChannel).send({
                    content: data.setlogschannel_confirmation_message
                        .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                })
                await client.db.set(`${interaction.guildId}.GUILD.SERVER_LOGS.voice`, argsid.id);

                await interaction.editReply({
                    content: data.setlogschannel_command_work
                        .replace("${argsid.id}", argsid.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                });
                return;
            } catch (e) {
                await interaction.editReply({ content: data.setlogschannel_command_error });
                return;
            };
        };

        /*                                        MESSAGES LOGS                                                */

        if (type === "4") {
            let typeOfLogs = data.setlogschannel_var_msg;
            if (!argsid) {
                await interaction.editReply({ content: data.setlogschannel_not_specified_args });
                return;
            };

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setlogschannel_logs_embed_title)
                    .setDescription(data.setlogschannel_logs_embed_description_on_enable
                        .replace(/\${argsid\.id}/g, argsid.id)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace(/\${typeOfLogs}/g, typeOfLogs)
                    )

                let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };

            try {
                let already = await client.db.get(`${interaction.guildId}.GUILD.SERVER_LOGS.message`)
                if (already === argsid.id) {
                    await interaction.editReply({ content: data.setlogschannel_already_this_channel });
                    return;
                };

                (client.channels.cache.get(argsid.id) as BaseGuildTextChannel).send({
                    content: data.setlogschannel_confirmation_message
                        .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                })
                await client.db.set(`${interaction.guildId}.GUILD.SERVER_LOGS.message`, argsid.id);

                await interaction.editReply({
                    content: data.setlogschannel_command_work
                        .replace("${argsid.id}", argsid.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                });
                return;
            } catch (e) {
                await interaction.editReply({ content: data.setlogschannel_command_error });
                return;
            };
        };

        /*                                        BOOST LOGS                                                */

        if (type === "5") {
            let typeOfLogs = data.setlogschannel_var_boost;
            if (!argsid) {
                await interaction.editReply({ content: data.setlogschannel_not_specified_args });
                return;
            };

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setlogschannel_logs_embed_title)
                    .setDescription(data.setlogschannel_logs_embed_description_on_enable
                        .replace(/\${argsid\.id}/g, argsid.id)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace(/\${typeOfLogs}/g, typeOfLogs)
                    )

                let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };

            try {
                let already = await client.db.get(`${interaction.guildId}.GUILD.SERVER_LOGS.boosts`)
                if (already === argsid.id) {
                    await interaction.editReply({ content: data.setlogschannel_already_this_channel });
                    return;
                };

                (client.channels.cache.get(argsid.id) as BaseGuildTextChannel).send({
                    content: data.setlogschannel_confirmation_message
                        .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                })
                await client.db.set(`${interaction.guildId}.GUILD.SERVER_LOGS.boosts`, argsid.id);

                await interaction.editReply({
                    content: data.setlogschannel_command_work
                        .replace("${argsid.id}", argsid.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                });
                return;
            } catch (e) {
                await interaction.editReply({ content: data.setlogschannel_command_error });
                return;
            };
        };


        /*                                        DELETE LOGS                                                */
        if (type === "off") {
            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setlogschannel_logs_embed_title)
                    .setDescription(data.setlogschannel_logs_embed_description_on_off
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    )

                let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };

            let checkData = await client.db.get(`${interaction.guildId}.GUILD.SERVER_LOGS`);
            if (!checkData) {
                await interaction.editReply({ content: data.setlogschannel_already_deleted });
                return;
            };

            await client.db.delete(`${interaction.guildId}.GUILD.SERVER_LOGS`);
            await interaction.editReply({
                content: data.setlogschannel_command_work_on_delete
                    .replace("${interaction.guild.name}", interaction.guild?.name as string)
            });
            return;
        }

        /*                                        TICKET  LOGS                                                */
        if (type === "6") {
            let typeOfLogs = data.setlogschannel_var_tickets;
            let blockQ = await client.db.get(`${interaction.guildId}.GUILD.TICKET.disable`);

            if (!argsid) {
                await interaction.editReply({ content: data.setlogschannel_not_specified_args });
                return;
            };

            if (blockQ) {
                await interaction.editReply({ content: data.open_disabled_command });
                return;
            };

            try {
                let already = await client.db.get(`${interaction.guildId}.GUILD.TICKET.logs`);

                if (already === argsid.id) {
                    await interaction.editReply({ content: data.setlogschannel_already_this_channel });
                    return;
                };

                (client.channels.cache.get(argsid.id) as BaseGuildTextChannel).send({
                    content: data.setlogschannel_confirmation_message
                        .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                });

                await client.db.set(`${interaction.guildId}.GUILD.TICKET.logs`, argsid.id);

                await interaction.editReply({
                    content: data.setlogschannel_command_work
                        .replace("${argsid.id}", argsid.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                });
            } catch (e) {
                await interaction.editReply({ content: data.setlogschannel_command_error });
            };

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setlogschannel_logs_embed_title)
                    .setDescription(data.setlogschannel_logs_embed_description_on_enable
                        .replace(/\${argsid\.id}/g, argsid.id)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace(/\${typeOfLogs}/g, typeOfLogs)
                    )

                let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };
            return;
        };
    },
};