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

slashInfo.newfeatures.support.run = async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: data.support_not_admin });
    }

    let action = interaction.options.getString("action");
    let input = interaction.options.getString("input");
    let roles = interaction.options.getRole("roles");

    if (!roles) {
        return interaction.reply({ content: data.support_command_not_role });
    }
    if (action == "true") {
        await DataBaseModel({
            id: DataBaseModel.Set, key: `${interaction.guild.id}.GUILD.SUPPORT`, value:
            {
                input: input,
                rolesId: roles.id,
                state: action
            }
        });

        interaction.reply({
            content: data.support_command_work
                .replace("${interaction.guild.name}", interaction.guild.name)
                .replace("${input}", input)
                .replace("${roles.id}", roles.id)
        });

        try {
            logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.setjoinroles_logs_embed_title_on_enable)
                .setDescription(data.setjoinroles_logs_embed_description_on_enable
                    .replace("${interaction.user.id}", interaction.user.id)
                )

            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e) { logger.err(e) };
    } else {
        await DataBaseModel({ id: DataBaseModel.Delete, key: `${interaction.guild.id}.GUILD.SUPPORT` });

        await interaction.reply({
            content: data.support_command_work_on_disable
                .replace("${interaction.guild.name}", interaction.guild.name)
        })

        try {
            logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.setjoinroles_logs_embed_title_on_enable)
                .setDescription(data.setjoinroles_logs_embed_description_on_enable
                    .replace("${interaction.user.id}", interaction.user.id)
                )

            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e) { logger.err(e) };
    };
};

module.exports = slashInfo.newfeatures.support;