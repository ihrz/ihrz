const db = require('quick.db')
const ms = require('ms')
const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');

module.exports = {
    name: 'weekly',
    description: 'Earn your weekly gain from you work',
    run: async (client, interaction) => {
  
        let timeout = 604800000 
        let amount = 1000
        let weekly = await db.fetch(`weekly_${interaction.guild.id}_${interaction.user.id}`);
    
        if (weekly !== null && timeout - (Date.now() - weekly) > 0) {
            let time = ms(timeout - (Date.now() - weekly));
    
          interaction.reply({content: `Sorry you must wait **${time}** before running this command!`})
        } else {
        let embed = new MessageEmbed()
        .setAuthor(`Daily`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
        .setColor("GREEN")
        .setDescription(`**Weekly Reward**`)
        .addField(`Collected`, `${amount}🪙`)
    
        interaction.reply({embeds: [embed]})
        return db.add(`money_${interaction.guild.id}_${interaction.user.id}`, amount),
        db.set(`weekly_${interaction.guild.id}_${interaction.user.id}`, Date.now()),
       filter = (interaction) => interaction.user.id === interaction.member.id;
      }
    }
}