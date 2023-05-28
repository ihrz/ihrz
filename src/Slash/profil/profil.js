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

const yaml = require('js-yaml'), fs = require('fs');
const getLanguage = require(`${process.cwd()}/src/lang/getLanguage`);

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
        let fileContents = fs.readFileSync(`${process.cwd()}/filsrces/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        const { QuickDB } = require("quick.db");
        const db = new QuickDB();
        const member = interaction.options.getUser('user') || interaction.user

        var description = await db.get(`GLOBAL.USER_PROFIL.${member.id}.desc`)
        if (!description) var description = data.profil_not_description_set
        var level = await db.get(`${interaction.guild.id}.USER.${member.id}.XP_LEVELING.level`)
        if (!level) var level = 0
        var balance = await db.get(`${interaction.guild.id}.USER.${member.id}.ECONOMY.money`)
        if (!balance) var balance = 0
        var age = await db.get(`GLOBAL.USER_PROFIL.${member.id}.age`)
        if (!age) var age = data.profil_unknown

        let profil = new EmbedBuilder()
            .setTitle(data.profil_embed_title
                .replace(/\${member\.tag}/g, member.tag)
            )
            .setDescription(`\`${description}\``)
            .addFields(
                { name: data.profil_embed_fields_nickname, value: member.tag, inline: false },
                { name: data.profil_embed_fields_money, value: balance + data.profil_embed_fields_money_value, inline: false },
                { name: data.profil_embed_fields_xplevels, value: level + data.profil_embed_fields_xplevels_value, inline: false },
                { name: data.profil_embed_fields_age, value: age + data.profil_embed_fields_age_value, inline: false })
            .setColor("#ffa550")
        interaction.reply({ embeds: [profil] })
        const filter = (interaction) => interaction.user.id === interaction.member.id;
    }
}