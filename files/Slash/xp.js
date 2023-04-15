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

const config = require('../config.json');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();
module.exports = {
  name: 'xp',
  description: 'Show your user xp level',
  options: [
    {
        name: 'user',
        type: ApplicationCommandOptionType.User,
        description: 'The user you want to lookup, keep blank if you want to show your stats',
        required: false
    }
],
  run: async (client, interaction) => {
    let sus = interaction.options.getMember("user")
    if(!sus){ 
      var user = interaction.user
      var level = await db.get(`${interaction.guild.id}.USER.${user.id}.XP_LEVELING.level`) || 0;
      var currentxp = await db.get(`${interaction.guild.id}.USER.${user.id}.XP_LEVELING.xp`) || 0;
      var xpNeeded = level * 500 + 500 
      var expNeededForLevelUp = xpNeeded - currentxp
      let nivEmbed = new EmbedBuilder()
    .setTitle("__**XP Level**__: \`"+ user.username+ "\`")
    .setColor('#0014a8')
    .addFields({ name: ":arrow_up:・__Levels:__", value: "`"+`${currentxp}/${xpNeeded}`+ "\`", inline: true },
    { name: ":money_with_wings:・__Experience:__", value: "`"+level+ "\`", inline: true })
    .setDescription(`\`${expNeededForLevelUp}\` **experience points needed for the next level!**`)
    .setTimestamp()
    .setThumbnail("https://cdn.discordapp.com/attachments/847484098070970388/850684283655946240/discord-icon-new-2021-logo-09772BF096-seeklogo.com.png")
    .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 })})
    
      interaction.reply({embeds: [nivEmbed]})
    }else{
      var level = await db.get(`${interaction.guild.id}.USER.${sus.user.id}.XP_LEVELING.level`) || 0;
      var currentxp = await db.get(`${interaction.guild.id}.USER.${sus.user.id}.XP_LEVELING.xp`) || 0;
      var xpNeeded = level * 500 + 500 
      var expNeededForLevelUp = xpNeeded - currentxp
      let nivEmbed = new EmbedBuilder()
    .setTitle("__**XP Level**__: \`"+ sus.user.username+ "\`")
    .setColor('#0014a8')
    .addFields({ name: ":arrow_up:・__Levels:__", value: "`"+`${currentxp}/${xpNeeded}`+ "\`", inline: true },
    { name: ":money_with_wings:・__Experience:__", value: "`"+level+ "\`", inline: true })
    .setDescription(`\`${expNeededForLevelUp}\` **experience points needed for the next level!**`)
    .setTimestamp()
    .setThumbnail("https://cdn.discordapp.com/attachments/847484098070970388/850684283655946240/discord-icon-new-2021-logo-09772BF096-seeklogo.com.png")
    .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 })})
    
      interaction.reply({embeds: [nivEmbed]})
    }
    const filter = (interaction) => interaction.user.id === interaction.member.id;
    return;
    }}