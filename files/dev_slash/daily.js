const { QuickDB } = require("quick.db");
const db = new QuickDB();
const ms = require('ms')
const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');

module.exports = {
    name: 'daily',
    description: 'Earn your daily gain from you work',
    run: async (client, interaction) => {
        let timeout = 86400000
        let amount = 500
        let daily = await db.fetch(`daily_${interaction.guildId}_${interaction.user.id}`);
    
        if (daily !== null && timeout - (Date.now() - daily) > 0) {
            let time = ms(timeout - (Date.now() - daily));
    
            interaction.reply({content: `Sorry you must wait **${time}** before running this command!`})
        } else {
        let embed = new MessageEmbed()
        .setAuthor(`Daily`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
        .setColor("GREEN")
        .setDescription(`**Daily Reward**`)
        .addField(`Collected`, `${amount}🪙`)
    
        interaction.reply({embeds: [embed]})
        db.add(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, amount)
        db.set(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.daily`, Date.now())
            
        }
  
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}