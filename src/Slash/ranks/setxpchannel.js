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

const logger = require(`${process.cwd()}/src/core/logger`);
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);

slashInfo.ranks.setxpchannel.run = async (client, interaction) => {
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = await getLanguageData(interaction.guild.id);

        let type = interaction.options.getString("action")
        let argsid = interaction.options.getChannel("channel")

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: data.setxpchannels_not_admin });
        }
        if (type === "on") {
            if (!argsid) return interaction.reply({ content: data.setxpchannels_valid_channel_message })

            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setxpchannels_logs_embed_title_enable)
                    .setDescription(data.setxpchannels_logs_embed_description_enable.replace(/\${interaction\.user.id}/g, interaction.user.id)
                    .replace(/\${argsid}/g, argsid.id))

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { logger.err(e) };
            try {
                let already = await DataBaseModel({id: DataBaseModel.Get, key: `${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels`})
                if (already === argsid.id) return interaction.reply({ content: data.setxpchannels_already_with_this_config })
                client.channels.cache.get(argsid.id).send({ content: data.setxpchannels_confirmation_message })
                await DataBaseModel({id: DataBaseModel.Set, key: `${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels`, value: argsid.id});

                return interaction.reply({ content: data.setxpchannels_command_work_enable.replace(/\${argsid}/g, argsid.id) });

            } catch (e) {
                interaction.reply({ content: data.setxpchannels_command_error_enable });
            }


        }
        if (type == "off") {
            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setxpchannels_logs_embed_title_disable)
                    .setDescription(data.setxpchannels_logs_embed_description_disable.replace(/\${interaction\.user.id}/g, interaction.user.id))

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { logger.err(e) };
            try {
                let already2 = await DataBaseModel({ id: DataBaseModel.Get, key: `${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels` });
                
                if (already2 === "off") return interaction.reply(data.setxpchannels_already_disabled_disable);

                await DataBaseModel({ id: DataBaseModel.Delete, key: `${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels` });
                return interaction.reply({content: data.setxpchannels_command_work_disable});
            } catch (e) {
                return await interaction.reply(data.setxpchannels_command_error_disable);
            }
        }
};

module.exports = slashInfo.ranks.setxpchannel;