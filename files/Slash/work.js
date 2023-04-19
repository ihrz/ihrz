const { QuickDB } = require("quick.db");
const db = new QuickDB();
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
  name: 'work',
  description: 'Work and earn money into your bank',
  run: async (client, interaction) => {

    const talkedRecentlyforw = new Set();

    if (talkedRecentlyforw.has(interaction.user.id)) {
      return message.channel.send("**Wait 50minutes before rob user again !** " + `${interaction.user.username}#${interaction.user.discriminator}`);
    }

    let amount = Math.floor(Math.random() * 200) + 1;

    let embed = new EmbedBuilder()
      .setAuthor({ name: `${interaction.user.username}#${interaction.user.discriminator}, it payed off!`, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
      .setDescription(`${interaction.user.username}#${interaction.user.discriminator}, you've worked and earned ${amount}$ !`)
      .setColor("#f1d488")


    interaction.reply({ embeds: [embed] })
    await db.add(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, amount)

    talkedRecentlyforw.add(interaction.user.id);
    setTimeout(() => {
      talkedRecentlyforw.delete(interaction.user.id);
    }, 3600000);

    const filter = (interaction) => interaction.user.id === interaction.member.id;
  }
}
