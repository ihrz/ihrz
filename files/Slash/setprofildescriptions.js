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

        var desc = interaction.options.getString("descriptions")
        if (!desc) return interaction.reply(":x: | **Please give a correct description.**")


        await db.set(`GLOBAL.USER_PROFIL.${interaction.user.id}.desc`, desc)
        interaction.reply("**Your description has been updated successfully.**")
        const filter = (interaction) => interaction.user.id === interaction.member.id;
    }
}