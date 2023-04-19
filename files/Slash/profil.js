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


module.exports = {
    name: 'profil',
    description: 'See the iHorizon profils of discord user!',
    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionType.User,
            description: 'The user you wan\'t to lookup',
            required: false
        }
    ],

    run: async (client, interaction) => {

        const { QuickDB } = require("quick.db");
        const db = new QuickDB();
        const member = interaction.options.getUser('user') || interaction.user

        var description = await db.get(`GLOBAL.USER_PROFIL.${member.id}.desc`)
        if (!description) var description = "Not descriptions definded !"
        var level = await db.get(`${interaction.guild.id}.USER.${member.id}.XP_LEVELING.level`)
        if (!level) var level = 0
        var balance = await db.get(`${interaction.guild.id}.USER.${member.id}.ECONOMY.money`)
        if (!balance) var balance = 0
        var age = await db.get(`GLOBAL.USER_PROFIL.${member.id}.age`)
        if (!age) var age = "Unknown"

        let profil = new EmbedBuilder()
            .setTitle("📌 __Profile of " + member.tag + "__")
            .setDescription(`\`${description}\``)
            .addFields(
                { name: "📝 ・ __Nickname__", value: member.tag, inline: false },
                { name: "🪙 ・ __Money__", value: balance + " coins", inline: false },
                { name: "💳 ・ __XP Levels__", value: level + " XP Levels", inline: false },
                { name: "🎂 ・ __Age__", value: age + " years olds", inline: false })
            .setColor("#ffa550")
        interaction.reply({ embeds: [profil] })
        const filter = (interaction) => interaction.user.id === interaction.member.id;
    }
}