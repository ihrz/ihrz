const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const config = require('../config.json');
const fs = require("fs")
const db = require("quick.db")

module.exports = async (client, channel) => {
    if (!channel.guild) return;
    let idu = db.fetch(`channel_log_custom${channel.guild.id}_${channel.id}`)
    if(idu === undefined || idu === null) return
    let ida = db.fetch(`customchanID_${channel.guild.id}_${idu}`)
    if(channel.id != ida) return
    try{
      let deleteSuccesThree = new MessageEmbed()
      .setAuthor('Custom channels has ben deleted by force /!\\')
      .setColor("GREEN")
      .setDescription(`<@${idu}>, your custom channel has been forcibly deleted. \ni have delete this to my databse correctly !`)

      db.delete(`customchanstatus_${channel.guild.id}_${idu}`)
      db.delete(`customchanID_${channel.guild.id}_${idu}`)
      db.delete(`channel_log_custom${channel.guild.id}_${channelsID.id}`)
      db.delete(`customchanName_${channel.guild.id}_${idu}`)
      let h4 = db.fetch(`Here4CreateChannels_${channel.guild.id}`)
     return client.channels.cache.get(h4).send({embeds: [deleteSuccesThree]})
  }catch{
    let deleteSuccesTwo = new MessageEmbed()
      .setAuthor('Custom channels has ben deleted by force /!\\')
      .setColor("RED")
      .setDescription(`<@${idu}>, your custom channel has been forcibly deleted. \ni try to delete the channel to my database...`)

    let h4 = db.fetch(`Here4CreateChannels_${channel.guild.id}`)
    client.channels.cache.get(h4).send({embeds: [deleteSuccesTwo]})
      .catch(err => {
    db.delete(`customchanstatus_${channel.guild.id}_${idu}`)
    db.delete(`customchanID_${channel.guild.id}_${idu}`)
    db.delete(`channel_log_custom${channel.guild.id}_${channel.id}`)
    return db.delete(`customchanName_${channel.guild.id}_${idu}`)
      })
    

    db.delete(`customchanstatus_${channel.guild.id}_${idu}`)
    db.delete(`customchanID_${channel.guild.id}_${idu}`)
    db.delete(`channel_log_custom${channel.guild.id}_${channel.id}`)
    db.delete(`customchanName_${channel.guild.id}_${idu}`)

    let deleteSuccesThree = new MessageEmbed()
    .setAuthor('Custom channels has ben deleted by force /!\\')
    .setColor("GREEN")
    .setDescription(`<@${idu}>, your custom channel has been forcibly deleted. \ni have delete this to my databse corectly !`)

    client.channels.cache.get(h4).send({embeds: [deleteSuccesThree]})
    .catch(err => {
      db.delete(`customchanstatus_${channel.guild.id}_${idu}`)
      db.delete(`customchanID_${channel.guild.id}_${idu}`)
      db.delete(`channel_log_custom${channel.guild.id}_${channel.id}`)
      return db.delete(`customchanName_${channel.guild.id}_${idu}`)
        })
return};
}