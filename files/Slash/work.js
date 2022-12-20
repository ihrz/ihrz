const db = require('quick.db')
const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');

module.exports = {
  name: 'work',
  description: 'Work and earn money into your bank',
  run: async (client, interaction) => {

    const talkedRecentlyforw = new Set();   
    
    if (talkedRecentlyforw.has(interaction.user.id)) {
            return message.channel.send("**Wait 50minutes before rob user again !** " + `${interaction.user.username}#${interaction.user.discriminator}`);
    }

    let amount = Math.floor(Math.random() * 200) + 1;

    let embed = new MessageEmbed()
    .setAuthor(`${interaction.user.username}#${interaction.user.discriminator}, it payed off!`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`) 
    .setDescription(`${interaction.user.username}#${interaction.user.discriminator}, you've worked and earned ${amount}$ !`)
    .setColor("ORANGE")
    

    interaction.reply({embeds: [embed]})
    db.add(`money_${interaction.guildId}_${interaction.user.id}`, amount)

    talkedRecentlyforw.add(interaction.user.id);
    setTimeout(() => {
      talkedRecentlyforw.delete(interaction.user.id);
    }, 3600000);

    const filter = (interaction) => interaction.user.id === interaction.member.id;
    }}
