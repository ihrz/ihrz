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
        const member = interaction.options.getMember("member")


        let inv = await db.get(`${interaction.guild.id}.USER.${member.user.id}.INVITES.DATA.invites`);
        let leaves = await db.get(`${interaction.guild.id}.USER.${member.user.id}.INVITES.DATA.leaves`);
        let Regular = await db.get(`${interaction.guild.id}.USER.${member.user.id}.INVITES.DATA.regular`);
        let bonus = await db.get(`${interaction.guild.id}.USER.${member.user.id}.INVITES.DATA.bonus`);


        let embed = new EmbedBuilder()
            .setColor("#92A8D1")
            .setTitle("Inviter Stats")
            .setTimestamp()
            .setThumbnail(member.user.avatarURL({ dynamic: true }))
            .setDescription(`<@${member.user.id}> have \`${inv || 0}\` Invites (\`${Regular || 0}\` Regular, \`${bonus || 0}\` Bonus, \`${leaves || 0}\` Leaves).`);
        interaction.reply({ embeds: [embed] })

        const filter = (interaction) => interaction.user.id === interaction.member.id;
    }
}