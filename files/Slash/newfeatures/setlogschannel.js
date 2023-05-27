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
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);
const logger = require(`${process.cwd()}/files/core/logger`);

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
                { name: "Voice Logs", value: "3" },
                { name: "Messages Logs", value: "4" },

                { name: "Moderation Logs (WIP)", value: "2" },
                { name: "Raids Logs (WIP)", value: "5" },
            ]
        },
        {
            name: 'channel',
            type: ApplicationCommandOptionType.Channel,
            description: "The channel you wan't your logs message !",
            required: false
        }
    ],
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: data.setlogschannel_not_admin });
        }

        let type = interaction.options.getString("type")
        let argsid = interaction.options.getChannel("channel")

        /*                                        MESSAGES LOGS                                                */

        if (type === "4") {
            let typeOfLogs = "Messages Logs"
            if (!argsid) return interaction.reply({ content: data.setlogschannel_not_specified_args });

            // try {
            //     logEmbed = new EmbedBuilder()
            //         .setColor("#bf0bb9")
            //         .setTitle(data.setchannels_logs_embed_title_on_join)
            //         .setDescription(data.setchannels_logs_embed_description_on_join
            //             .replace(/\${argsid\.id}/g, argsid.id)
            //             .replace(/\${interaction\.user\.id}/g, interaction.user.id)
            //         )

            //     let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            //     if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            // } catch (e) { logger.err(e) };

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

        /*                                        ROLES LOGS                                                */
        if (type === "1") {
            let typeOfLogs = "Roles Logs"
            if (!argsid) return interaction.reply({ content: data.setlogschannel_not_specified_args })

            // try {
            //     logEmbed = new EmbedBuilder()
            //         .setColor("#bf0bb9")
            //         .setTitle(data.setchannels_logs_embed_title_on_join)
            //         .setDescription(data.setchannels_logs_embed_description_on_join
            //             .replace(/\${argsid\.id}/g, argsid.id)
            //             .replace(/\${interaction\.user\.id}/g, interaction.user.id)
            //         )

            //     let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            //     if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            // } catch (e) { logger.err(e) };

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

        /*                                        VOICES LOGS                                                */
        if (type === "3") {
            let typeOfLogs = "Voice Logs"
            if (!argsid) return interaction.reply({ content: data.setlogschannel_not_specified_args })

            // try {
            //     logEmbed = new EmbedBuilder()
            //         .setColor("#bf0bb9")
            //         .setTitle(data.setchannels_logs_embed_title_on_join)
            //         .setDescription(data.setchannels_logs_embed_description_on_join
            //             .replace(/\${argsid\.id}/g, argsid.id)
            //             .replace(/\${interaction\.user\.id}/g, interaction.user.id)
            //         )

            //     let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            //     if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            // } catch (e) { logger.err(e) };

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

        if (type === "off") {
            // try {
            //     logEmbed = new EmbedBuilder()
            //         .setColor("#bf0bb9")
            //         .setTitle(data.setchannels_logs_embed_title_on_off)
            //         .setDescription(data.setchannels_logs_embed_description_on_off
            //             .replace(/\${interaction\.user\.id}/g, interaction.user.id)
            //         )

            //     let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            //     if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            // } catch (e) { logger.err(e) };

            let checkData = await db.get(`${interaction.guild.id}.GUILD.SERVER_LOGS`)
            if (!checkData) return interaction.reply({ content: data.setchannels_already_on_off })

            await db.delete(`${interaction.guild.id}.GUILD.SERVER_LOGS`);
            return interaction.reply({
                content: data.setlogschannel_command_work_on_delete
                    .replace("${interaction.guild.name}", interaction.guild.name)
            });
        }
    }
};