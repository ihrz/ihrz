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

slashInfo.moderation.lock.run = async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    const Lockembed = new EmbedBuilder()
        .setColor("#5b3475")
        .setTimestamp()
        .setDescription(data.lock_embed_message_description
            .replace(/\${interaction\.user\.id}/g, interaction.user.id)
        );

    const permission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages);
    if (!permission) return interaction.reply({ content: data.lock_dont_have_permission });

    interaction.channel.permissionOverwrites.create(interaction.guild.id, { SendMessages: false }).then(() => {
        interaction.reply({ embeds: [Lockembed] })
    }).catch(() => { })
    try {
        logEmbed = new EmbedBuilder()
            .setColor("#bf0bb9")
            .setTitle(data.lock_logs_embed_title)
            .setDescription(data.lock_logs_embed_description
                .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                .replace(/\${interaction\.channel\.id}/g, interaction.channel.id)
            )
        let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
        if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
    } catch (e) { return };
};

module.exports = slashInfo.moderation.lock;