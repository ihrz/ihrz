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
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

module.exports = {
    name: 'setserverlang',
    description: 'Set the server lang to another',
    options: [
        {
            name: 'language',
            type: ApplicationCommandOptionType.String,
            description: 'What language you want ? (soon more)',
            required: true,
            choices: [
                {
                    name: "Deutsch",
                    value: "de-DE"
                },
                {
                    name: "English",
                    value: "en-US"
                },
                {
                    name: "French",
                    value: "fr-FR"
                },
                {
                    name: "Italian",
                    value: "it-IT"
                },
                {
                    name: "Japanese",
                    value: "jp-JP"
                },
                {
                    name: "Spanish",
                    value: "es-ES"
                }/*,
                {
                    name: "Norwegian",
                    value: "no-NO"
                }*/
            ],
        }
    ],
    run: async (client, interaction) => {
        let data = await getLanguageData(interaction.guild.id);

        let type = interaction.options.getString("language")

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: data.setserverlang_not_admin });
        }

        
        try {
            logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.setserverlang_logs_embed_title_on_enable)
                .setDescription(data.setserverlang_logs_embed_description_on_enable
                .replace(/\${type}/g, type)
                .replace(/\${interaction\.user.id}/g, interaction.user.id)
                )

            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e) { logger.err(e) };

        try {
            let already = await db.get(`${interaction.guild.id}.GUILD.LANG`)
            if (already) {
                if (already.lang === type) return interaction.reply({ content: data.setserverlang_already })
            }
            await db.set(`${interaction.guild.id}.GUILD.LANG`, { lang: type });

            return interaction.reply({ content: data.setserverlang_command_work_enable.replace(/\${type}/g, type) });

        } catch (e) {
            logger.err(e)
            interaction.reply({ content: data.setserverlang_command_error_enable });
        }
    }
}