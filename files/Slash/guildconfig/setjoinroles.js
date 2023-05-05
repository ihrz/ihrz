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

const yaml = require('js-yaml');
const fs = require('fs');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);

module.exports = {
    name: 'setjoinroles',
    description: 'Set a roles to new user',
    options: [
        {
            name: "value",
            description: "<Power on /Power off/Show the message set>",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                {
                    name: "Power on",
                    value: "true"
                },
                {
                    name: "Power off",
                    value: "false"
                },
                {
                    name: "Show the roles set",
                    value: "ls"
                },
                {
                    name: "Need help",
                    value: "needhelp"
                }
            ]
        },
        {
            name: 'roles',
            type: ApplicationCommandOptionType.Role,
            description: '<roles id>',
            required: false
        }
    ],
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: data.setjoinroles_not_admin });
        }

        let query = interaction.options.getString("value")
        var roleid = interaction.options.get("roles")
        let help_embed = new EmbedBuilder()
            .setColor("#016c9a")
            .setTitle(data.setjoinroles_help_embed_title)
            .setDescription(data.setjoinroles_help_embed_description)

        if (query === "true") {
            if (!roleid) return interaction.reply({embeds: [help_embed]});
            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setjoinroles_logs_embed_title_on_enable)
                    .setDescription(data.setjoinroles_logs_embed_description_on_enable
                        .replace("${interaction.user.id}", interaction.user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) {console.log(e) };

            try {
                let already = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinroles`);
                if (already === roleid.value) return interaction.reply({ content: data.setjoinroles_already_on_enable })
                await db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinroles`, roleid.value);

                return interaction.reply({
                    content: data.setjoinroles_command_work_enable
                        .replace("${roleid}", roleid.value)
                });
            } catch (e) {
                return interaction.reply({ content: data.setjoinroles_command_error_on_enable });
            }
        } else {
            if (query === "false") {
                try {
                    let ban_embed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.setjoinroles_logs_embed_title_on_disable)
                        .setDescription(data.setjoinroles_logs_embed_description_on_disable
                            .replace("${interaction.user.id}", interaction.user.id)
                        )
                    let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                    logchannel.send({ embeds: [ban_embed] })
                } catch (e) { }

                try {
                    let already = await db.delete(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinroles`);
                    if (!already) return interaction.reply({ content: data.setjoinroles_dont_need_command_on_disable })

                    return interaction.reply({ content: data.setjoinroles_command_work_on_disable });

                } catch (e) {
                    return interaction.reply({ content: data.setjoinroles_command_error_on_disable });
                }
            } else {
                if (query === "ls") {
                    let roles = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinroles`)
                    if (!roles) return interaction.reply({content: data.setjoinroles_command_any_set_ls})
                    return interaction.reply({content: data.setjoinroles_command_work_ls
                        .replace("${roles}", roles)
                    })
                } else {
                    interaction.reply({embeds: [help_embed]});
                }
            }
        }
    }
}
