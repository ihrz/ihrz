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
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = getLanguageData(interaction.guild.id);
        
        var age = interaction.options.getNumber("age")

        await db.set(`GLOBAL.USER_PROFIL.${interaction.user.id}.age`, age)
        interaction.reply({ content: data.setprofilage_command_work })
    }
}