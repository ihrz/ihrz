const { QuickDB } = require("quick.db");
const db = new QuickDB();
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

const getLanguage = require(`${process.cwd()}/src/lang/getLanguage`);
const yaml = require('js-yaml');
const fs = require('fs');
module.exports = {
    name: 'blockpub',
    description: 'Disable the member\'s spam with this command',
    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,
            description: 'What you want to do?',
            required: true,
            choices: [
                {
                    name: "Disable the spam protection",
                    value: "off"
                },
                {
                    name: 'Enable the spam protection',
                    value: "on"
                },
            ],
        },
    ],
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/src/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
        let data = yaml.load(fileContents)
        let turn = interaction.options.getString("action")
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: data.blockpub_not_admin });
        }
        if (turn === "on") {
            await db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.antipub`, "on")
            return interaction.reply({ content: data.blockpub_now_enable })
        }

        if (turn === "off") {
            await db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.antipub`, "off")
            return interaction.reply({ content: data.blockpub_now_disable })
        }
    }
}