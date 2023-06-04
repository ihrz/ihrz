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
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const logger = require(`${process.cwd()}/src/core/logger`);

slashInfo.utils.setmentionrole.run = async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    let type = interaction.options.getString("action")
    let argsid = interaction.options.getRole("roles")

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: data.setrankroles_not_admin });
    }
    if (type === "on") {
        if (!argsid) return interaction.reply({ content: data.setrankroles_not_roles_typed })

        try {
            logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.setrankroles_logs_embed_title_enable)
                .setDescription(data.setrankroles_logs_embed_description_enable
                    .replace(/\${interaction\.user.id}/g, interaction.user.id)
                    .replace(/\${argsid}/g, argsid.id)
                )

            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e) { logger.err(e) };

        try {
            let already = await db.get(`${interaction.guild.id}.GUILD.RANK_ROLES.roles`)
            if (already === argsid.id) return interaction.reply({ content: data.setrankroles_already_this_in_db })

            await db.set(`${interaction.guild.id}.GUILD.RANK_ROLES.roles`, argsid.id);

            let e = new EmbedBuilder().setDescription(data.setrankroles_command_work
                .replace(/\${argsid}/g, argsid.id));

            return interaction.reply({ embeds: [e] });

        } catch (e) {
            logger.err(e)
            interaction.reply({ content: data.setrankroles_command_error });
        }
    }
    if (type == "off") {
        try {
            logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.setrankroles_logs_embed_title_disable)
                .setDescription(data.setrankroles_logs_embed_description_disable
                    .replace(/\${interaction\.user.id}/g, interaction.user.id)
                )

            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e) { logger.err(e) };

        try {
            await db.delete(`${interaction.guild.id}.GUILD.RANK_ROLES.roles`);
            return interaction.reply({
                content: data.setrankroles_command_work_disable
                    .replace(/\${interaction\.user.id}/g, interaction.user.id)
            });

        } catch (e) {
            logger.err(e)
            interaction.reply(data.setrankroles_command_error);
        }
    }
};

module.exports = slashInfo.utils.setmentionrole;