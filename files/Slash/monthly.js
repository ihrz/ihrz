const { QuickDB } = require("quick.db");
const db = new QuickDB();
const ms = require('ms')
const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');

module.exports = {
    name: 'monthly',
    description: 'Earn your monthly gain from you work',
    run: async (client, interaction) => {
    let timeout = 2592000000
    let amount = 5000
    let monthly = await db.fetch(`monthly_${interaction.guildId}_${interaction.user.id}`);

    if (monthly !== null && timeout - (Date.now() - monthly) > 0) {
        let time = ms(timeout - (Date.now() - monthly));

        interaction.reply({content: `Sorry you must wait **${time}** before running this command!`})
    } else {
        let embed = new MessageEmbed()
        .setAuthor(`monthly`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
        .setColor("GREEN")
        .setDescription(`**monthly Reward**`)
        .addField(`Collected`, `${amount}🪙`)

    interaction.reply({embeds: [embed]})
    db.add(`money_${interaction.guildId}_${interaction.user.id}`, amount)
    db.set(`monthly_${interaction.guildId}_${interaction.user.id}`, Date.now())
    }
      const filter = (interaction) => interaction.user.id === interaction.member.id;
}}