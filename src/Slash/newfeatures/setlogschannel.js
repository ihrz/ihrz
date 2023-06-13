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

const slashInfo = require(`${process.cwd()}/files/ihorizon-api/slashHandler`);
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);

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

const logger = require(`${process.cwd()}/src/core/logger`);

slashInfo.newfeatures.setlogschannel.run = async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: data.setlogschannel_not_admin });
    }

    let type = interaction.options.getString("type");
    let argsid = interaction.options.getChannel("channel");

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
            let already = await DataBaseModel({ id: DataBaseModel.Get, key: `${interaction.guild.id}.GUILD.SERVER_LOGS.roles` });

            if (already === argsid.id) return interaction.reply({ content: data.setlogschannel_already_this_channel })
            client.channels.cache.get(argsid.id).send({
                content: data.setlogschannel_confirmation_message
                    .replace("${interaction.user.id}", interaction.user.id)
                    .replace("${typeOfLogs}", typeOfLogs)
            })
            await DataBaseModel({ id: DataBaseModel.Set, key: `${interaction.guild.id}.GUILD.SERVER_LOGS.roles`, values: argsid.id });

            return interaction.reply({
                content: data.setlogschannel_command_work
                    .replace("${argsid.id}", argsid.id)
                    .replace("${typeOfLogs}", typeOfLogs)
            });
        } catch (e) {
            return await interaction.reply({ content: data.setlogschannel_command_error });
        }
    };

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
            let already = await DataBaseModel({ id: DataBaseModel.Get, key: `${interaction.guild.id}.GUILD.SERVER_LOGS.moderation` });

            if (already === argsid.id) return interaction.reply({ content: data.setlogschannel_already_this_channel })
            client.channels.cache.get(argsid.id).send({
                content: data.setlogschannel_confirmation_message
                    .replace("${interaction.user.id}", interaction.user.id)
                    .replace("${typeOfLogs}", typeOfLogs)
            })
            await DataBaseModel({
                id: DataBaseModel.Set, key: `${interaction.guild.id}.GUILD.SERVER_LOGS.moderation`,
                value: argsid.id
            });

            return interaction.reply({
                content: data.setlogschannel_command_work
                    .replace("${argsid.id}", argsid.id)
                    .replace("${typeOfLogs}", typeOfLogs)
            });
        } catch (e) {
            return await interaction.reply({ content: data.setlogschannel_command_error });
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
            let already = await DataBaseModel({ id: DataBaseModel.Get, key: `${interaction.guild.id}.GUILD.SERVER_LOGS.voice` });
            if (already === argsid.id) return interaction.reply({ content: data.setlogschannel_already_this_channel })
            client.channels.cache.get(argsid.id).send({
                content: data.setlogschannel_confirmation_message
                    .replace("${interaction.user.id}", interaction.user.id)
                    .replace("${typeOfLogs}", typeOfLogs)
            })
            // await db.set(`${interaction.guild.id}.GUILD.SERVER_LOGS.voice`, argsid.id);
            await DataBaseModel({ id: DataBaseModel.Set, key: `${interaction.guild.id}.GUILD.SERVER_LOGS.voice`, value: argsid.id });

            return interaction.reply({
                content: data.setlogschannel_command_work
                    .replace("${argsid.id}", argsid.id)
                    .replace("${typeOfLogs}", typeOfLogs)
            });
        } catch (e) {
            return await interaction.reply({ content: data.setlogschannel_command_error });
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
            
            // let already = await db.get(`${interaction.guild.id}.GUILD.SERVER_LOGS.message`)
            let already = await DataBaseModel({id:DataBaseModel.Get, key: `${interaction.guild.id}.GUILD.SERVER_LOGS.message`})
            if (already === argsid.id) return interaction.reply({ content: data.setlogschannel_already_this_channel });
            client.channels.cache.get(argsid.id).send({
                content: data.setlogschannel_confirmation_message
                    .replace("${interaction.user.id}", interaction.user.id)
                    .replace("${typeOfLogs}", typeOfLogs)
            })
            // await db.set(`${interaction.guild.id}.GUILD.SERVER_LOGS.message`, argsid.id);
            await DataBaseModel({ id: DataBaseModel.Set, key: `${interaction.guild.id}.GUILD.SERVER_LOGS.message`, value: argsid.id });

            return interaction.reply({
                content: data.setlogschannel_command_work
                    .replace("${argsid.id}", argsid.id)
                    .replace("${typeOfLogs}", typeOfLogs)
            });
        } catch (e) {
            return await interaction.reply({ content: data.setlogschannel_command_error });
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

        // let checkData = await db.get(`${interaction.guild.id}.GUILD.SERVER_LOGS`)
        let checkData = await DataBaseModel({ id: DataBaseModel.Get, key: `${interaction.guild.id}.GUILD.SERVER_LOGS` })
        if (!checkData) return interaction.reply({ content: data.setlogschannel_already_deleted })

        // await db.delete(`${interaction.guild.id}.GUILD.SERVER_LOGS`);
        await DataBaseModel({ id: DataBaseModel.Delete, key: `${interaction.guild.id}.GUILD.SERVER_LOGS` });
        return await interaction.reply({
            content: data.setlogschannel_command_work_on_delete
                .replace("${interaction.guild.name}", interaction.guild.name)
        });
    }
};

module.exports = slashInfo.newfeatures.setlogschannel;