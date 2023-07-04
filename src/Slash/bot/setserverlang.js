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
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);

slashInfo.bot.setserverlang.run = async (client, interaction) => {
    let data = await getLanguageData(interaction.guild.id);
    let type = interaction.options.getString("language");

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: data.setserverlang_not_admin });
    };

    try {
        logEmbed = new EmbedBuilder()
            .setColor("#bf0bb9")
            .setTitle(data.setserverlang_logs_embed_title_on_enable)
            .setDescription(data.setserverlang_logs_embed_description_on_enable
                .replace(/\${type}/g, type)
                .replace(/\${interaction\.user.id}/g, interaction.user.id)
            )

        let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
        if (logchannel) { logchannel.send({ embeds: [logEmbed] }) };
    } catch (e) { logger.err(e) };

    try {
        let already = await DataBaseModel({id: DataBaseModel.Get, key: `${interaction.guild.id}.GUILD.LANG`});
        if (already) {
            if (already.lang === type) return interaction.reply({ content: data.setserverlang_already });
        }
        await DataBaseModel({id:DataBaseModel.Set, key:`${interaction.guild.id}.GUILD.LANG`,value: { lang: type }});

        return interaction.reply({ content: data.setserverlang_command_work_enable.replace(/\${type}/g, type) });

    } catch (e) {
        logger.err(e);
        interaction.reply({ content: data.setserverlang_command_error_enable });
    }
};

module.exports = slashInfo.bot.setserverlang;