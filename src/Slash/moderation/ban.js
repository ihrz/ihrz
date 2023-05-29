const { Client, Intents, Collection, Permissions, PermissionsBitField, ApplicationCommandType, ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const logger = require(`${process.cwd()}/src/core/logger`);

module.exports = {
    name: 'ban',
    description: 'ban a member in guild',
    options: [
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,
            description: 'the member you want to ban',
            required: true
        }
    ],
    run: async (client, interaction) => {
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
        member.send({ content: data.ban_message_to_the_banned_member
            .replace(/\${interaction\.guild\.name}/g, interaction.guild.name)
            .replace(/\${interaction\.member\.user\.username}/g, interaction.member.user.username)
            .replace(/\${interaction\.member\.user\.discriminator}/g, interaction.member.user.discriminator)
        })
        .catch(() => {})
            .then(() => {
                member.ban({ reason: 'banned by ' + interaction.user.username })
                    .then((member) => {
                        interaction.reply({ content: data.ban_command_work
                            .replace(/\${member\.user\.id}/g, member.user.id)
                            .replace(/\${interaction\.member\.id}/g, interaction.member.id)
                        })
                        .catch(() => {});

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
    }
}