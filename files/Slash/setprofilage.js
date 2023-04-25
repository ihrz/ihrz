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
module.exports = {
    name: 'setprofilage',
    description: 'Set your age on the iHorizon Profil !',
    options: [
        {
            name: 'age',
            type: ApplicationCommandOptionType.Number,
            description: 'You age',
            required: true
        }
    ],
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(process.cwd() + "/files/lang/en-US.yml", 'utf-8');
        let data = yaml.load(fileContents)
        var age = interaction.options.getNumber("age")

        await db.set(`GLOBAL.USER_PROFIL.${interaction.user.id}.age`, age)
        interaction.reply({ content: data.setprofilage_command_work })
    }
}