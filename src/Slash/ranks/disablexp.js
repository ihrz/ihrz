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
} = require(`${process.cwd()}/files/ihorizonjs`);

const logger = require(`${process.cwd()}/src/core/logger`);
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);

slashInfo.ranks.disablexp.run = async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: data.disablexp_not_admin });
    };

    let types = interaction.options.get("action").value

    if (types == "off") {
        try {
            logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.disablexp_logs_embed_title_disable)
                .setDescription(data.disablexp_logs_embed_description_disable.replace(/\${interaction\.user\.id}/g, interaction.user.id))

            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e) { logger.err(e) };
        await DataBaseModel({id: DataBaseModel.Set, key: `${interaction.guild.id}.GUILD.XP_LEVELING.on_or_off`, value: "off"});
        return interaction.reply({ content: data.disablexp_command_work_disable });
    } else {
        if (types == "on") {
            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.disablexp_logs_embed_title_enable)
                    .setDescription(data.disablexp_logs_embed_description_enable.replace(/\${interaction\.user\.id}/g, interaction.user.id))

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { logger.err(e) };
            await DataBaseModel({ id: DataBaseModel.Set, key: `${interaction.guild.id}.GUILD.XP_LEVELING.on_or_off`, value: "on" });
            return interaction.reply({ content: data.disablexp_command_work_enable });
        }
    }
};

module.exports = slashInfo.ranks.disablexp;