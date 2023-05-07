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
const logger = require(`${process.cwd()}/files/core/logger`);

const yaml = require('js-yaml');
const fs = require('fs');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);

module.exports = {
    name: 'setjoindm',
    description: 'Set a join dm message when user join the guild',
    options: [
        {
            name: "value",
            description: "Choose the action you want to do",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                {
                    name: "Power on",
                    value: "on"
                },
                {
                    name: "Power off",
                    value: "off"
                },
                {
                    name: "Show the message set",
                    value: "ls"
                }
            ]
        },
        {
            name: 'message',
            type: ApplicationCommandOptionType.String,
            description: '<Message if the first args is on>',
            required: false
        }
    ],
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: data.setjoindm_not_admin });
        }

        let type = interaction.options.getString("value")
        let dm_msg = interaction.options.getString("message")

        if (type === "on") {
            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setjoindm_logs_embed_title_on_enable)
                    .setDescription(data.setjoindm_logs_embed_description_on_enable
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { logger.err(e) };

            try {
                if (!dm_msg) return interaction.reply({ content: data.setjoindm_not_specified_args_on_enable })
                await db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joindm`, dm_msg);
                return interaction.reply({ content: data.setjoindm_confirmation_message_on_enable 
                    .replace(/\${dm_msg}/g, dm_msg) 
                });
            } catch (e) {
                interaction.reply({ content: data.setjoindm_command_error_on_enable });
            }
        }

        if (type === "off") {
            try {
                let ban_embed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setjoindm_logs_embed_title_on_disable)
                    .setDescription(data.setjoindm_logs_embed_description_on_disable
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    )
                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                logchannel.send({ embeds: [ban_embed] })
            } catch (e) {
                return;
            }

            try {
                let already_off = await db.get(`joindm-${interaction.guild.id}`)
                if (already_off === "off") return interaction.reply({ content: data.setjoindm_already_disable })
                await db.delete(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joindm`);
                return interaction.reply({ content: data.setjoindm_confirmation_message_on_disable });

            } catch (e) {
                interaction.reply({ content: data.setjoindm_command_error_on_disable });
            }
        }
        if (type === "ls") {
            let already_off = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joindm`)
            if (already_off === null) {
                return interaction.reply({ content: data.setjoindm_not_setup_ls })
            }
            return interaction.reply({
                content: data.setjoindm_command_work_ls
                    .replace(/\${already_off}/g, already_off)
            })
        }
    }
}
