/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

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
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = await getLanguageData(interaction.guild.id);

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