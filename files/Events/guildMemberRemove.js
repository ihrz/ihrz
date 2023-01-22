
const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const config = require('../config.json');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client, member) => {
    try{
      let wChan = await db.get(`${member.guild.id}.GUILD.GUILD.CONFIG.leave`)
      if(wChan == null) return;
      if(!wChan) return;

    let messssssage = await db.get(`${member.guild.id}.GUILD.GUILD.CONFIG.leavemessage`)
    if(!messssssage){
                let embed = new MessageEmbed()
                      .setColor("RED")
                      .setTitle("Leave [-]")
                      .setDescription(`Goodbye <@${member.user.id}> | You leave **${member.guild.name}** (bad) \n We are now ${member.guild.memberCount} !`)
                      .setTimestamp()
            return client.channels.cache.get(wChan).send({embeds: [embed]})
    }
    var messssssage4 = messssssage
    .replace("{user}", member.user.tag)
    .replace("{guild}", member.guild.name)
    .replace("{membercount}", member.guild.memberCount)
    
        let embed = new MessageEmbed()
              .setColor("RED")
              .setDescription(messssssage4)
              .setTimestamp()
    client.channels.cache.get(wChan).send({embeds: [embed]})
    }catch(e){
      return console.error(e)
    }
}