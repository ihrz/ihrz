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
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = await getLanguageData(interaction.guild.id);

        var desc = interaction.options.getString("descriptions")

        await db.set(`GLOBAL.USER_PROFIL.${interaction.user.id}.desc`, desc)
        interaction.reply({ content: data.setprofildescriptions_command_work })
    }
}