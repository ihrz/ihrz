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

const yaml = require('js-yaml'), fs = require('fs');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);

module.exports = {
    name: 'setprofildescriptions',
    description: 'Set your descriptions on the iHorizon Profil !',
    options: [
        {
            name: 'descriptions',
            type: ApplicationCommandOptionType.String,
            description: 'you descriptions on the iHorizon profil',
            required: true
        }
    ],
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        var desc = interaction.options.getString("descriptions")

        await db.set(`GLOBAL.USER_PROFIL.${interaction.user.id}.desc`, desc)
        interaction.reply({ content: data.setprofildescriptions_command_work })
    }
}