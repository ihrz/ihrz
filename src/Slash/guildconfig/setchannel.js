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

const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);
const logger = require(`${process.cwd()}/src/core/logger`);

slashInfo.guildconfig.setchannel.run = async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: data.setchannels_not_admin });
    }

    let type = interaction.options.getString("type");
    let argsid = interaction.options.getChannel("channel");

    if (type === "join") {
        if (!argsid) return interaction.reply({ content: data.setchannels_not_specified_args })

        try {
            logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.setchannels_logs_embed_title_on_join)
                .setDescription(data.setchannels_logs_embed_description_on_join
                    .replace(/\${argsid\.id}/g, argsid.id)
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                )

            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e) { logger.err(e) };

        try {
            let already = await DataBaseModel({ id: DataBaseModel.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.join` })
            if (already === argsid.id) return interaction.reply({ content: data.setchannels_already_this_channel_on_join })
            client.channels.cache.get(argsid.id).send({ content: data.setchannels_confirmation_message_on_join })
            await DataBaseModel({ id: DataBaseModel.Set, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.join`, value: argsid.id })

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
            let already = await DataBaseModel({ id: DataBaseModel.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leave` });

            if (already === argsid.id) return interaction.reply({ content: data.setchannels_already_this_channel_on_leave })
            client.channels.cache.get(argsid.id).send({ content: data.setchannels_confirmation_message_on_leave })
            await DataBaseModel({ id: DataBaseModel.Set, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leave`, value: argsid.id });

            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setchannels_logs_embed_title_on_leave)
                    .setDescription(data.setchannels_logs_embed_description_on_leave
                        .replace(/\${argsid\.id}/g, argsid.id)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { logger.err(e) };

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
            logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.setchannels_logs_embed_title_on_off)
                .setDescription(data.setchannels_logs_embed_description_on_off
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                )

            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) };
        } catch (e) { logger.err(e) };

        let leavec = await DataBaseModel({ id: DataBaseModel.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.join` });
        let joinc = await DataBaseModel({ id: DataBaseModel.Get, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leave` });
        if (joinc === "off" & leavec === "off") return interaction.reply({ content: data.setchannels_already_on_off });

        await DataBaseModel({ id: DataBaseModel.Delete, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.join` });
        await DataBaseModel({ id: DataBaseModel.Delete, key: `${interaction.guild.id}.GUILD.GUILD_CONFIG.leave` });
        return interaction.reply({ content: data.setchannels_command_work_on_off });
    }
};

module.exports = slashInfo.guildconfig.setchannel;