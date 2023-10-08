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
    EmbedBuilder,
    PermissionsBitField,
    ApplicationCommandOptionType,
} from 'discord.js';

import { Command } from '../../../types/command';
import logger from '../../core/logger';

export const command: Command = {
    name: 'setlogschannel',
    description: 'Set a logs channels for Audits Logs!',
    options: [
        {
            name: 'type',
            type: ApplicationCommandOptionType.String,
            description: 'Specified logs category',
            required: true,
            choices: [
                { name: "Delete all settings", value: "off" },
                { name: "Roles Logs", value: "1" },
                { name: "Moderation Logs", value: "2" },
                { name: "Voice Logs", value: "3" },
                { name: "Messages Logs", value: "4" }]
        },
        {
            name: 'channel',
            type: ApplicationCommandOptionType.Channel,
            description: "The channel you wan't your logs message !",
            required: false
        }
    ],
    category: 'newfeatures',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setlogschannel_not_admin });
            return;
        };

        let type = interaction.options.getString("type");
        let argsid = interaction.options.getChannel("channel");

        /*                                        ROLES LOGS                                                */
        if (type === "1") {
            let typeOfLogs = "Roles Logs"
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

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) };
            } catch (e: any) { logger.err(e) };

            try {
                let already = await client.db.get(`${interaction.guild.id}.GUILD.SERVER_LOGS.roles`);

                if (already === argsid.id) {
                    await interaction.editReply({ content: data.setlogschannel_already_this_channel });
                    return;
                };

                interaction.client.channels.cache.get(argsid.id).send({
                    content: data.setlogschannel_confirmation_message
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                })
                await client.db.set(`${interaction.guild.id}.GUILD.SERVER_LOGS.roles`, argsid.id);

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
            let typeOfLogs = "Moderation Logs"
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

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };

            try {
                let already = await client.db.get(`${interaction.guild.id}.GUILD.SERVER_LOGS.moderation`);

                if (already === argsid.id) {
                    await interaction.editReply({ content: data.setlogschannel_already_this_channel });
                    return;
                };

                interaction.client.channels.cache.get(argsid.id).send({
                    content: data.setlogschannel_confirmation_message
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                })
                await client.db.set(`${interaction.guild.id}.GUILD.SERVER_LOGS.moderation`, argsid.id);

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
            let typeOfLogs = "Voice Logs"
            if (!argsid) {
                await interaction.editReply({ content: data.setlogschannel_not_specified_args });
                return;
            }
            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setlogschannel_logs_embed_title)
                    .setDescription(data.setlogschannel_logs_embed_description_on_enable
                        .replace(/\${argsid\.id}/g, argsid.id)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace(/\${typeOfLogs}/g, typeOfLogs)
                    )

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };

            try {
                let already = await client.db.get(`${interaction.guild.id}.GUILD.SERVER_LOGS.voice`);
                if (already === argsid.id) {
                    await interaction.editReply({ content: data.setlogschannel_already_this_channel });
                    return;
                };

                interaction.client.channels.cache.get(argsid.id).send({
                    content: data.setlogschannel_confirmation_message
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                })
                await client.db.set(`${interaction.guild.id}.GUILD.SERVER_LOGS.voice`, argsid.id);

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
            let typeOfLogs = "Messages Logs"
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

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };

            try {
                let already = await client.db.get(`${interaction.guild.id}.GUILD.SERVER_LOGS.message`)
                if (already === argsid.id) {
                    await interaction.editReply({ content: data.setlogschannel_already_this_channel });
                    return;
                };

                interaction.client.channels.cache.get(argsid.id).send({
                    content: data.setlogschannel_confirmation_message
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                })
                await client.db.set(`${interaction.guild.id}.GUILD.SERVER_LOGS.message`, argsid.id);

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

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };

            let checkData = await client.db.get(`${interaction.guild.id}.GUILD.SERVER_LOGS`);
            if (!checkData) {
                await interaction.editReply({ content: data.setlogschannel_already_deleted });
                return;
            };

            await client.db.delete(`${interaction.guild.id}.GUILD.SERVER_LOGS`);
            await interaction.editReply({
                content: data.setlogschannel_command_work_on_delete
                    .replace("${interaction.guild.name}", interaction.guild.name)
            });
            return;
        }
    },
};