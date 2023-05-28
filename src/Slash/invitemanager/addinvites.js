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
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = getLanguageData(interaction.guild.id);

        const user = interaction.options.getMember("member");
        const amount = interaction.options.getNumber("amount");

        let a = new EmbedBuilder().setColor("#FF0000").setDescription(data.addinvites_not_admin_embed_description)

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ embeds: [a] })
        }

        await db.add(`${interaction.guild.id}.USER.${user.id}.INVITES.DATA.invites`, amount);

        const finalEmbed = new EmbedBuilder()
            .setDescription(data.addinvites_confirmation_embed_description
                .replace(/\${amount}/g, amount)
                .replace(/\${user}/g, user)
                )
            .setColor(`#92A8D1`)
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) });
        await db.add(`${interaction.guild.id}.USER.${user.id}.INVITES.DATA.bonus`, amount);
        interaction.reply({ embeds: [finalEmbed] });

        try {
            logEmbed = new EmbedBuilder()
              .setColor("#bf0bb9")
              .setTitle(data.addinvites_logs_embed_title)
              .setDescription(data.addinvites_logs_embed_description
                .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                .replace(/\${amount}/g, amount)
                .replace(/\${user\.id}/g, user.id)
                )
      
            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
          } catch (e) { return };
    }
}
