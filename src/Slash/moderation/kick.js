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

module.exports = {
    name: 'kick',
    description: 'kick a member in guild',
    options: [
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,
            description: 'the member you want to kick',
            required: true
        }
    ],
    run: async (client, interaction) => {
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = getLanguageData(interaction.guild.id);
        
        const member = interaction.options.getMember("member")
        const permission = interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)
        if (!permission) return interaction.reply({ content: data.kick_not_permission });
        if (!interaction.guild.members.me.permissions.has([PermissionsBitField.Flags.KickMembers])) {
            return interaction.reply({ content: data.kick_dont_have_permission })
        }
        if (member.user.id === interaction.member.id) {
            return interaction.reply({ content: data.kick_attempt_kick_your_self })
        };

        if (interaction.member.roles.highest.position < member.roles.highest.position) {
            return interaction.reply({ content: data.kick_attempt_kick_higter_member });
        }
        member.send({
            content: data.kick_message_to_the_banned_member
                .replace(/\${interaction\.guild\.name}/g, interaction.guild.name)
                .replace(/\${interaction\.member\.user\.username}/g, interaction.member.user.username)
                .replace(/\${interaction\.member\.user\.discriminator}/g, interaction.member.user.discriminator)
        })
        .catch(() => {})
            .then(() => {
                member.kick({ reason: 'kicked by ' + interaction.user.username })
                    .then((member) => {
                        interaction.reply({
                            content: data.kick_command_work
                                .replace(/\${member\.user}/g, member.user)
                                .replace(/\${interaction\.user}/g, interaction.user)
                        })
                        try {
                            logEmbed = new EmbedBuilder()
                                .setColor("#bf0bb9")
                                .setTitle(data.kick_logs_embed_title)
                                .setDescription(data.kick_logs_embed_description
                                    .replace(/\${member\.user}/g, member.user)
                                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                                );

                            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                        } catch (e) { logger.err(e) };
                    })

            })
    }
};