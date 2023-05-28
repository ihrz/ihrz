const {
    Client,
    Intents,
    Collection,
    ChannelType,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

const yaml = require('js-yaml'), fs = require('fs');
const getLanguage = require(`${process.cwd()}/src/lang/getLanguage`);

module.exports = {
    name: 'invites',
    description: 'I love you, show me your love for me back ! Invite me !',
    options: [
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,
            description: 'the member you want to show them invites',
            required: true
        }
    ],
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/src/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        const member = interaction.options.getMember("member")


        let inv = await db.get(`${interaction.guild.id}.USER.${member.user.id}.INVITES.DATA.invites`);
        let leaves = await db.get(`${interaction.guild.id}.USER.${member.user.id}.INVITES.DATA.leaves`);
        let Regular = await db.get(`${interaction.guild.id}.USER.${member.user.id}.INVITES.DATA.regular`);
        let bonus = await db.get(`${interaction.guild.id}.USER.${member.user.id}.INVITES.DATA.bonus`);


        let embed = new EmbedBuilder()
            .setColor("#92A8D1")
            .setTitle(data.invites_confirmation_embed_title)
            .setTimestamp()
            .setThumbnail(member.user.avatarURL({ dynamic: true }))
            .setDescription(
            data.invites_confirmation_embed_description
            .replace(/\${member\.user\.id}/g, member.user.id)
            .replace(/\${bonus\s*\|\|\s*0}/g, bonus || 0)
            .replace(/\${leaves\s*\|\|\s*0}/g, leaves || 0)
            .replace(/\${Regular\s*\|\|\s*0}/g, Regular || 0)
            .replace(/\${inv\s*\|\|\s*0}/g, inv || 0)
            );
        interaction.reply({ embeds: [embed] })
    }
}