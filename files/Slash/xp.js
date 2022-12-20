const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const config = require('../config.json');
const fs = require("fs")
const db = require("quick.db")
module.exports = {
  name: 'xp',
  description: 'Show your user xp level',
  options: [
    {
        name: 'user',
        type: 'USER',
        description: 'The user you want to lookup, keep blank if you want to show your stats',
        required: false
    }
],
  run: async (client, interaction) => {
    let sus = interaction.options.getMember("user")
    if(!sus){ 
      var user = interaction.user
      var level = db.fetch(`level_${user.id}`) || 0;
      var currentxp = db.fetch(`xp_${user.id}`) || 0;
      var xpNeeded = level * 500 + 500 
      var expNeededForLevelUp = xpNeeded - currentxp
      let nivEmbed = new MessageEmbed()
    .setTitle("__**XP Level**__: \`"+ user.username+ "\`")
    .setColor('BLUE')
    .addField(":arrow_up:・__Levels:__", "`"+`${currentxp}/${xpNeeded}`+ "\`", true)
    .addField(":money_with_wings:・__Experience:__", "`"+level+ "\`", true)
    .setDescription(`\`${expNeededForLevelUp}\` **experience points needed for the next level!**`)
    .setTimestamp()
    .setThumbnail("https://cdn.discordapp.com/attachments/847484098070970388/850684283655946240/discord-icon-new-2021-logo-09772BF096-seeklogo.com.png")
    .setFooter("iHORIZON")
    
      interaction.reply({embeds: [nivEmbed]})
    }else{
      var level = db.fetch(`level_${sus.user.id}`) || 0;
      var currentxp = db.fetch(`xp_${sus.user.id}`) || 0;
      var xpNeeded = level * 500 + 500 
      var expNeededForLevelUp = xpNeeded - currentxp
      let nivEmbed = new MessageEmbed()
    .setTitle("__**XP Level**__: \`"+ sus.user.username+ "\`")
    .setColor('BLUE')
    .addField(":arrow_up:・__Levels:__", "`"+`${currentxp}/${xpNeeded}`+ "\`", true)
    .addField(":money_with_wings:・__Experience:__", "`"+level+ "\`", true)
    .setDescription(`\`${expNeededForLevelUp}\` **experience points needed for the next level!**`)
    .setTimestamp()
    .setThumbnail("https://cdn.discordapp.com/attachments/847484098070970388/850684283655946240/discord-icon-new-2021-logo-09772BF096-seeklogo.com.png")
    .setFooter("iHORIZON")
    
      interaction.reply({embeds: [nivEmbed]})
    }
    const filter = (interaction) => interaction.user.id === interaction.member.id;
    return;
    }}