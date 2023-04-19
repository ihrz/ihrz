const { QuickDB } = require("quick.db");
const db = new QuickDB();
const ms = require('ms')
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
  name: 'weekly',
  description: 'Earn your weekly gain from you work',
  run: async (client, interaction) => {

    let timeout = 604800000
    let amount = 1000
    let weekly = await db.get(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.weekly`);

    if (weekly !== null && timeout - (Date.now() - weekly) > 0) {
      let time = ms(timeout - (Date.now() - weekly));

      interaction.reply({ content: `Sorry you must wait **${time}** before running this command!` })
    } else {
      let embed = new EmbedBuilder()
        .setAuthor({ name: `Daily`, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
        .setColor("#a4cb80")
        .setDescription(`**Weekly Reward**`)
        .addFields({ name: "Collected", value: `${amount}🪙` })


      interaction.reply({ embeds: [embed] })
      return await db.add(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, amount),
        await db.set(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.weekly`, Date.now()),
        filter = (interaction) => interaction.user.id === interaction.member.id;
    }
  }
}