const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const config = require('../config.json');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client, message) => {
  if(!message.guild) return;
  if(message.author.bot) return;
    async function xpFetcher () {
        if(!message.guild) return;
      if (!message.channel.type === "GUILD_TEXT") { return; }
            if(message.author.bot) return
            const randomNumber = Math.floor(Math.random() * 100) + 150;
            await db.add(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xp`, randomNumber)
            await db.add(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xptotal`, randomNumber)

            var level = await db.get(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.level`) || 1
            var xp = await db.get(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xp`)
            var xpNeeded = level * 500;
            if(xpNeeded < xp){
                await db.add(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.level`, 1)
                var newLevel = await db.get(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.level`, 1)
                await db.sub(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xp`, xpNeeded)
                let xp_turn = await db.get(`${message.guild.id}.GUILD.XP_LEVELING.on_or_off`)
                if(xp_turn === "off") { return };
                        if (!message.channel.permissionsFor(client.user).has(Permissions.FLAGS.SEND_MESSAGES)) { return; }
                        let xpChan = await db.get(`${message.guild.id}.GUILD.XP_LEVELING.xpchannels`)
                        if(!xpChan) return message.channel.send({content: `**GG**, <@`+message.author.id+`> you are +1, for xp level (Level : **${newLevel}**)`}).then((sent) => {
                          setTimeout(() => {
                   sent.delete();
               }, 3500);})
                        if(xpChan === "off") return message.channel.send({content: `**GG**, <@`+message.author.id+`> you are +1, for xp level (Level : **${newLevel}**)}`}).then((sent) => {
                          setTimeout(() => {
                   sent.delete();
               }, 3500);})
                      try{
                        client.channels.cache.get(xpChan).send({content: `**GG**, <@`+message.author.id+`> you are +1, for xp level (Level : **${newLevel}**)`}).then(msg => {});
                      }catch(e){ return}
    }}
    async function EconomyDebug() {
        if(!message.guild) return;
      if (!message.channel.type === "GUILD_TEXT") { return; }
      if(message.author.bot) return
      if(message.author.id == client.user.id) return
      d= await db.get(`${message.guild.id}.USER.${message.author.id}.ECONOMY.money`)
      if(!d){return await db.set(`${message.guild.id}.USER.${message.author.id}.ECONOMY.money`, 1) }
    }

    async function logsMessage() {
        if(!message.guild) return;
      if (!message.channel.type === "GUILD_TEXT") { return; }
      if(message.author.bot) return
      if(message.author.id == client.user.id) return
      const now = new Date();
      const CreateFiles = fs.createWriteStream('./files/logs/message/'+message.guild.id+".txt", {
        flags: 'a'  
    })
    let i = message.guild.name+" | MESSAGE | ["+now+"]"+" \n "+message.author.id+": "+message.content+" "+" in: #"+message.channel.name+""
    CreateFiles.write(i.toString()+'\r\n')
    }

    async function blockSpam() {
        if(!message.guild) return;
      if (!message.channel.type === "GUILD_TEXT") { return; }
      if(message.author.bot) return
      if(message.author.id == client.user.id) return
      let type = await db.get(`${message.guild.id}.GUILD.GUILD_CONFIG.antipub`)
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
