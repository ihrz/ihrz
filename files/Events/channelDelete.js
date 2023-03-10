const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const config = require('../config.json');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client, channel) => {
    if (!channel.guild) return;
    base = await db.get(`${channel.guild.id}.GUILD.CUSTOM_CHANNEL.${channel.id}`)
    main = await db.get(`${channel.guild.id}.GUILD.CUSTOM_CHANNEL`)
    if(base === undefined || base === null) return
    let idu = base.channel_log_custom
    if(idu === undefined || idu === null) return
    
    secondBase = await db.get(`${channel.guild.id}.USER.${idu}.CUSTOM_CHANNEL`)
    let ida = secondBase.customchanID
    if(channel.id != ida) return

    try{
      let deleteSuccesThree = new EmbedBuilder()
      .setAuthor('Custom channels has ben deleted by force /!\\')
      .setColor("GREEN")
      .setDescription(`<@${idu}>, your custom channel has been forcibly deleted. \ni have delete this to my databse correctly !`)

      await db.delete(`${channel.guild.id}.GUILD.CUSTOM_CHANNEL.${channel.id}`)
      await db.delete(`${channel.guild.id}.USER.${idu}.CUSTOM_CHANNEL`)
      
      let h4 = main.Here4CreateChannels
     return client.channels.cache.get(h4).send({embeds: [deleteSuccesThree]})
  }catch{
    let deleteSuccesTwo = new EmbedBuilder()
      .setAuthor('Custom channels has ben deleted by force /!\\')
      .setColor("RED")
      .setDescription(`<@${idu}>, your custom channel has been forcibly deleted. \ni try to delete the channel to my database...`)

      let h4 = main.Here4CreateChannels
    client.channels.cache.get(h4).send({embeds: [deleteSuccesTwo]})
      .catch(async (err) => {
        await db.delete(`${channel.guild.id}.GUILD.CUSTOM_CHANNEL.${channel.id}`)
        await db.delete(`${channel.guild.id}.USER.${idu}.CUSTOM_CHANNEL`)
        return
      });

      await db.delete(`${channel.guild.id}.GUILD.CUSTOM_CHANNEL.${channel.id}`)
      await db.delete(`${channel.guild.id}.USER.${idu}.CUSTOM_CHANNEL`)

    let deleteSuccesThree = new EmbedBuilder()
    .setAuthor('Custom channels has ben deleted by force /!\\')
    .setColor("GREEN")
    .setDescription(`<@${idu}>, your custom channel has been forcibly deleted. \ni have delete this to my databse corectly !`)

    client.channels.cache.get(h4).send({embeds: [deleteSuccesThree]})
    .catch(async (err) => {
      await db.delete(`${channel.guild.id}.GUILD.CUSTOM_CHANNEL.${channel.id}`)
      await db.delete(`${channel.guild.id}.USER.${idu}.CUSTOM_CHANNEL`);
        })
return};
}