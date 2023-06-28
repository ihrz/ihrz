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

const { Client, Intents, Collection, Permissions, PermissionsBitField, ApplicationCommandType, ApplicationCommandOptionType, EmbedBuilder } = require(`${process.cwd()}/files/ihorizonjs`);
const logger = require(`${process.cwd()}/src/core/logger`);

slashInfo.moderation.ban.run = async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    const member = interaction.guild.members.cache.get(interaction.options.get("member").user.id)
    const permission = interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)
    if (!permission) return interaction.reply({ content: data.ban_not_permission });
    if (!member) return interaction.reply({ content: data.ban_dont_found_member });

    if (!interaction.channel.permissionsFor(client.user).has('BAN_MEMBERS')) {
        return interaction.reply({ content: data.ban_dont_have_perm_myself })
    }

    if (member.user.id === interaction.member.id) { return interaction.reply({ content: data.ban_try_to_ban_yourself }) };
    if (interaction.member.roles.highest.position < member.roles.highest.position) {
        return interaction.reply({ content: data.ban_attempt_ban_higter_member });
    }

    if (!member.bannable) {
        return interaction.reply({ content: data.ban_cant_ban_member });
    }
    member.send({
        content: data.ban_message_to_the_banned_member
            .replace(/\${interaction\.guild\.name}/g, interaction.guild.name)
            .replace(/\${interaction\.member\.user\.username}/g, interaction.member.user.username)
            .replace(/\${interaction\.member\.user\.discriminator}/g, interaction.member.user.discriminator)
    })
        .catch(() => { })
        .then(() => {
            member.ban({ reason: 'banned by ' + interaction.user.username })
                .then((member) => {
                    interaction.reply({
                        content: data.ban_command_work
                            .replace(/\${member\.user\.id}/g, member.user.id)
                            .replace(/\${interaction\.member\.id}/g, interaction.member.id)
                    })
                        .catch(() => { });

                    try {
                        logEmbed = new EmbedBuilder()
                            .setColor("#bf0bb9")
                            .setTitle(data.ban_logs_embed_title)
                            .setDescription(data.ban_logs_embed_description
                                .replace(/\${member\.user\.id}/g, member.user.id)
                                .replace(/\${interaction\.member\.id}/g, interaction.member.id)
                            )
                        let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                        if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                    } catch (e) { logger.err(e) };
                })
        })
};

module.exports = slashInfo.moderation.ban;