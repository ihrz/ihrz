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
    ChannelType,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} = require('discord.js');

const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);

slashInfo.invitemanager.removeinvites.run = async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    const user = interaction.options.getMember("member")
    const amount = interaction.options.getNumber("amount")

    let a = new EmbedBuilder().setColor("#FF0000").setDescription(data.removeinvites_not_admin_embed_description);

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ embeds: [a] })
    }

    // await db.sub(`${interaction.guild.id}.USER.${user.id}.INVITES.DATA.invites`, amount);
    await DataBaseModel({id: DataBaseModel.Sub, key: `${interaction.guild.id}.USER.${user.id}.INVITES.DATA.invites`, value: amount});

    const finalEmbed = new EmbedBuilder()
        .setDescription(data.removeinvites_confirmation_embed_description
            .replace(/\${amount}/g, amount)
            .replace(/\${user}/g, user)
        )
        .setColor(`#92A8D1`)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) });
    // await db.sub(`${interaction.guild.id}.USER.${user.id}.INVITES.DATA.bonus`, amount);
    await DataBaseModel({id: DataBaseModel.Sub, key: `${interaction.guild.id}.USER.${user.id}.INVITES.DATA.bonus`, value: amount});

    interaction.reply({ embeds: [finalEmbed] });

    try {
        logEmbed = new EmbedBuilder()
            .setColor("#bf0bb9")
            .setTitle(data.removeinvites_logs_embed_title)
            .setDescription(data.removeinvites_logs_embed_description
                .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                .replace(/\${amount}/g, amount)
                .replace(/\${user\.id}/g, user.id)
            )

        let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
        if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
    } catch (e) { return };
};

module.exports = slashInfo.invitemanager.removeinvites;