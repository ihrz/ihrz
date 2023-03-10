const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const config = require("../config.json")

module.exports = {
    name: 'botinfo',
    description: 'Informations about the bot',
    run: async (client, interaction) => {
  
        let usersize = client.users.cache.size
        let chansize = client.channels.cache.size
        let servsize = client.guilds.cache.size
        let clientembed = new MessageEmbed()
        .setColor("YELLOW")
        .setThumbnail(client.user.avatarURL({ format: 'png', dynamic: true, size: 512 }))
        .addField("My Name:", `:green_circle: ${client.user.username}`, false)
        .addField("My Channels:", `:green_circle: ${chansize}`, false)
        .addField("My Servers:", `:green_circle: ${servsize}/100`, false)
        .addField("Members:", `:green_circle: ${usersize}`, false)
        .addField("Librairies:", ":green_circle: discord.js@13.10.3", false)
        .addField("Create at:", ":green_circle: "+client.user.createdAt, false)
        .addField("Create by:", ":green_circle: <@171356978310938624>", false)
        .setTimestamp()
        .setFooter(`${client.user.username}`, client.user.avatarURL({ format: 'png', dynamic: true, size: 512 }))
        .setTimestamp()
        
        interaction.reply({embeds: [clientembed]});  
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}