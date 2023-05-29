const {
    Client,
    Intents,
    Collection,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} = require('discord.js');

const { QuickDB } = require("quick.db");
const db = new QuickDB();

const yaml = require('js-yaml'), fs = require('fs');
const logger = require(`${process.cwd()}/src/core/logger`);

module.exports = {
    name: 'setlogschannel',
    description: 'Set a logs channels for Audits Logs',
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
    run: async (client, interaction) => {
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = await getLanguageData(interaction.guild.id);
        
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: data.setlogschannel_not_admin });
        }

        let type = interaction.options.getString("type")
        let argsid = interaction.options.getChannel("channel")

        /*                                        ROLES LOGS                                                */
        if (type === "1") {
            let typeOfLogs = "Roles Logs"
            if (!argsid) return interaction.reply({ content: data.setlogschannel_not_specified_args })

            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setlogschannel_logs_embed_title)
                    .setDescription(data.setlogschannel_logs_embed_description_on_enable
                        .replace(/\${argsid\.id}/g, argsid.id)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace(/\${typeOfLogs}/g, typeOfLogs)
                    )

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { logger.err(e) };

            try {
                let already = await db.get(`${interaction.guild.id}.GUILD.SERVER_LOGS.roles`)
                if (already === argsid.id) return interaction.reply({ content: data.setlogschannel_already_this_channel })
                client.channels.cache.get(argsid.id).send({
                    content: data.setlogschannel_confirmation_message
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                })
                await db.set(`${interaction.guild.id}.GUILD.SERVER_LOGS.roles`, argsid.id);

                return interaction.reply({
                    content: data.setlogschannel_command_work
                        .replace("${argsid.id}", argsid.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                });
            } catch (e) {
                interaction.reply({ content: data.setlogschannel_command_error });
            }
        }

        /*                                        MODERATION LOGS                                                */
        if (type === "2") {
            let typeOfLogs = "Moderation Logs"
            if (!argsid) return interaction.reply({ content: data.setlogschannel_not_specified_args })

            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setlogschannel_logs_embed_title)
                    .setDescription(data.setlogschannel_logs_embed_description_on_enable
                        .replace(/\${argsid\.id}/g, argsid.id)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace(/\${typeOfLogs}/g, typeOfLogs)
                    )

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { logger.err(e) };

            try {
                let already = await db.get(`${interaction.guild.id}.GUILD.SERVER_LOGS.moderation`)
                if (already === argsid.id) return interaction.reply({ content: data.setlogschannel_already_this_channel })
                client.channels.cache.get(argsid.id).send({
                    content: data.setlogschannel_confirmation_message
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                })
                await db.set(`${interaction.guild.id}.GUILD.SERVER_LOGS.moderation`, argsid.id);

                return interaction.reply({
                    content: data.setlogschannel_command_work
                        .replace("${argsid.id}", argsid.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                });
            } catch (e) {
                interaction.reply({ content: data.setlogschannel_command_error });
            }
        }

        /*                                        VOICES LOGS                                                */
        if (type === "3") {
            let typeOfLogs = "Voice Logs"
            if (!argsid) return interaction.reply({ content: data.setlogschannel_not_specified_args })

            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setlogschannel_logs_embed_title)
                    .setDescription(data.setlogschannel_logs_embed_description_on_enable
                        .replace(/\${argsid\.id}/g, argsid.id)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace(/\${typeOfLogs}/g, typeOfLogs)
                    )

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { logger.err(e) };

            try {
                let already = await db.get(`${interaction.guild.id}.GUILD.SERVER_LOGS.voice`)
                if (already === argsid.id) return interaction.reply({ content: data.setlogschannel_already_this_channel })
                client.channels.cache.get(argsid.id).send({
                    content: data.setlogschannel_confirmation_message
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                })
                await db.set(`${interaction.guild.id}.GUILD.SERVER_LOGS.voice`, argsid.id);

                return interaction.reply({
                    content: data.setlogschannel_command_work
                        .replace("${argsid.id}", argsid.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                });
            } catch (e) {
                interaction.reply({ content: data.setlogschannel_command_error });
            }
        }

        /*                                        MESSAGES LOGS                                                */

        if (type === "4") {
            let typeOfLogs = "Messages Logs"
            if (!argsid) return interaction.reply({ content: data.setlogschannel_not_specified_args });

            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setlogschannel_logs_embed_title)
                    .setDescription(data.setlogschannel_logs_embed_description_on_enable
                        .replace(/\${argsid\.id}/g, argsid.id)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace(/\${typeOfLogs}/g, typeOfLogs)
                    )

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { logger.err(e) };

            try {
                let already = await db.get(`${interaction.guild.id}.GUILD.SERVER_LOGS.message`)
                if (already === argsid.id) return interaction.reply({ content: data.setlogschannel_already_this_channel });
                client.channels.cache.get(argsid.id).send({
                    content: data.setlogschannel_confirmation_message
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                })
                await db.set(`${interaction.guild.id}.GUILD.SERVER_LOGS.message`, argsid.id);

                return interaction.reply({
                    content: data.setlogschannel_command_work
                        .replace("${argsid.id}", argsid.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                });
            } catch (e) {
                interaction.reply({ content: data.setlogschannel_command_error });
            }
        }

        /*                                        DELETE LOGS                                                */
        if (type === "off") {
            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setlogschannel_logs_embed_title)
                    .setDescription(data.setlogschannel_logs_embed_description_on_off
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { logger.err(e) };

            let checkData = await db.get(`${interaction.guild.id}.GUILD.SERVER_LOGS`)
            if (!checkData) return interaction.reply({ content: data.setlogschannel_already_deleted })

            await db.delete(`${interaction.guild.id}.GUILD.SERVER_LOGS`);
            return interaction.reply({
                content: data.setlogschannel_command_work_on_delete
                    .replace("${interaction.guild.name}", interaction.guild.name)
            });
        }
    }
};