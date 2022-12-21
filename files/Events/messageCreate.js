const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const config = require('../config.json');
const fs = require("fs")
const db = require("quick.db");
const { stringify } = require('querystring');

module.exports = async (client, message) => {
    async function xpFetcher () {
      if (!message.channel.type === "GUILD_TEXT") { return; }
            if(message.author.bot) return
            const randomNumber = Math.floor(Math.random() * 100) + 150;
            db.add(`xp_${message.author.id}`, randomNumber) 
            db.add(`xptotal_${message.author.id}`, randomNumber)
            var level = db.get(`level_${message.author.id}`) || 1
            var xp = db.get(`xp_${message.author.id}`)
            var xpNeeded = level * 500;
            if(xpNeeded < xp){
                var newLevel = db.add(`level_${message.author.id}`, 1) 
                db.subtract(`xp_${message.author.id}`, xpNeeded)
                let xp_turn = db.fetch(`xp_oro_${message.guild.id}`)
                if(xp_turn === "off") { return };
                        if (!message.channel.permissionsFor(client.user).has(Permissions.FLAGS.SEND_MESSAGES)) { return; }
                        let xpChan = db.fetch(`xpchannels-${message.guild.id}`)
                        if(!xpChan) return message.channel.send({content: `**GG**, <@`+message.author.id+`> you are +1, for xp level (Level : **${newLevel}**)`}).then(msg => {});
                        if(xpChan === "off") return message.channel.send({content: `**GG**, <@`+message.author.id+`> you are +1, for xp level (Level : **${newLevel}**)}`}).then(msg => {});
                      try{
                        client.channels.cache.get(xpChan).send({content: `**GG**, <@`+message.author.id+`> you are +1, for xp level (Level : **${newLevel}**)`}).then(msg => {});
                      }catch(e){ return}
    }}
    async function EconomyDebug() {
      if (message.author.bot || !message.channel.type === "GUILD_TEXT") { return; }
      if(message.author.id == client.user.id) return
      d= db.fetch(`money_${message.guild.id}_${message.author.id}`)
      if(!d){return db.set(`money_${message.guild.id}_${message.author.id}`, 1) }
    }

    async function logsMessage() {
      if (message.author.bot || !message.channel.type === "GUILD_TEXT") { return; }
      if (message.author.bot || message.channel.type === 'dm') { return; }
      const now = new Date();
      const CreateFiles = fs.createWriteStream('./files/logs/message/'+message.guild.id+".txt", {
        flags: 'a'  
    })
    let i = message.guild.name+" | MESSAGE | ["+now+"]"+" \n "+message.author.id+": "+message.content+" "+" in: #"+message.channel.name+""
    CreateFiles.write(i.toString()+'\r\n')
    }

    async function blockSpam() {
      if (message.author.bot || !message.channel.type === "GUILD_TEXT") { return; }
      let type = db.fetch(`antipub_${message.guild.id}`)
      if(type === "off"){ return}
      if(message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return;
      if(type == "on") {
        try{
const blacklist = ["https://","http://", "://", ".com", ".xyz", ".fr", "www.", ".gg", "g/", ".gg/", "youtube.be", "/?"];
    return blacklist.find(word => {
        if (message.content.toLowerCase().includes(word)) {
          return message.delete()
          }
       })
        }catch(e){ 
           return;
        }
    }
    
}
await xpFetcher(), EconomyDebug(), logsMessage(), blockSpam();
};