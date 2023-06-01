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

module.exports = {
    name: 'setrankroles',
    description: 'Set a rank roles whe user ping me in a channel',
    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,
            description: 'What you want to do?',
            required: true,
            choices: [
                {
                    name: "Power Off",
                    value: "off"
                },
                {
                    name: 'Power On',
                    value: "on"
                }
            ],
        },
        {
            name: 'roles',
            type: ApplicationCommandOptionType.Role,
            description: 'The specific roles to give !',
            required: false
        }
    ],
    run: async (client, interaction) => {
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
                return interaction.reply({content: data.setrankroles_command_work_disable
                    .replace(/\${interaction\.user.id}/g, interaction.user.id)
                });

            } catch (e) {
                logger.err(e)
                interaction.reply(data.setrankroles_command_error);
            }
        }
    }
}