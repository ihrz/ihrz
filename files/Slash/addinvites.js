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
    name: 'addinvites',
    description: 'Add invites from user with this command',
    options: [
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,
            description: 'the member you want to add invites',
            required: true
        },
        {
            name: 'amount',
            type: ApplicationCommandOptionType.Number,
            description: 'Number of invites you want to add',
            required: true
        }
    ],
    run: async (client, interaction) => {
        const user = interaction.options.getMember("member")
        const amount = interaction.options.getNumber("amount")

        let a = new EmbedBuilder().setColor("#FF0000").setDescription(`You need admin to use this!`)

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ embeds: [a] })
        }

        await db.add(`${interaction.guild.id}.USER.${user.id}.INVITES.DATA.invites`, amount);

        const finalEmbed = new EmbedBuilder()
            .setDescription(`Added ${amount} invites for ${user}`)
            .setColor(`#92A8D1`)
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) });
        await db.add(`${interaction.guild.id}.USER.${user.id}.INVITES.DATA.bonus`, amount);
        interaction.reply({ embeds: [finalEmbed] });

        try {
            logEmbed = new EmbedBuilder()
              .setColor("#bf0bb9")
              .setTitle("InviteManager Logs")
              .setDescription(`<@${interaction.user.id}> Added invites ${amount} to <@${user.id}> !`)
      
            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
          } catch (e) { return };
    }
}
