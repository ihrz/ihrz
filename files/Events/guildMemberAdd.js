const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const config = require('../config.json');
const fs = require("fs")
const db = require("quick.db")

module.exports = async (client, member, members) => {
    async function joinMessage() {
        try {
            let wChan = db.fetch(`join-${member.guild.id}`)
            if(wChan == null) return;
            if(!wChan) return;
            if(wChan === "off") return
            let messssssage = db.fetch(`joinmessage_${member.guild.id}`)
            if(!messssssage){
              let embed = new MessageEmbed()
              .setColor("GREEN")
              .setTitle("Join [+]")
              .setDescription(`Welcome ${member.user.tag} to **${member.guild.name}** :tada: \n We are now ${member.guild.memberCount} !`)
              .setTimestamp()
                    return client.channels.cache.get(wChan).send({embeds: [embed]})
            }
        
          var messssssage4 = messssssage
          .replace("{user}", member.user.tag)
          .replace("{guild}", member.guild.name)
          .replace("{createdat}", member.user.createdAt.toLocaleDateString()) 
          .replace("{membercount}", member.guild.memberCount)
              let embed = new MessageEmbed()
                    .setColor("GREEN")
                    .setDescription(messssssage4)
                    .setTimestamp()
          client.channels.cache.get(wChan).send({embeds: [embed]})
            }catch(e){ return console.error(e)
                
            }
    }

    async function joinRoles() {
        try {
            let roleid = db.fetch(`joinroles-${member.guild.id}`)
            if(roleid == null) return;
            if(!roleid) return;
            member.roles.add(roleid);
            }catch(e){ return console.error(e)}
    }

    async function joinDm() {
        try{
                let msg_dm = db.fetch(`joindm-${member.guild.id}`)
                if(msg_dm == null) return;
                if(!msg_dm) return;
                if(msg_dm === "off") return
                member.send({content: "This is a Join DM from "+member.guild.id+" ! \n \n"+msg_dm});
                  }catch(e){return console.log("Missing Permissions venant du JoinDM")}
    }

    async function blacklistFetch() {
            try{
            d= db.fetch(`money_${members.guild.id}_${members.user.id}`)
            if(!d){db.set(`money_${members.guild.id}_${members.user.id}`, 1) }
            var potential_blacklisted = db.fetch(`blacklist_${members.user.id}`)
            if(potential_blacklisted === true) { members.send({content: "You'r are been ban, because you are blacklisted"}).catch(members.ban({reason: 'blacklisted!'}))
            members.ban({reason: 'blacklisted!'})
            }else{ return};
          }catch{return}
    }

    await joinMessage(), joinRoles(), joinDm(), blacklistFetch();
    }