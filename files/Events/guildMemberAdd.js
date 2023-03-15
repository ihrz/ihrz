const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const config = require('../config.json');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client, member, members) => {

    async function joinRoles() {
        try {
            let roleid = await db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.joinroles`)
            if(roleid == null) return;
            if(!roleid) return;
            member.roles.add(roleid);
            }catch(e){ return console.error(e)}
    }

    async function joinDm() {
        try{
                let msg_dm = await db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.joindm`)
                if(msg_dm == null) return;
                if(!msg_dm) return;
                if(msg_dm === "off") return
                member.send({content: "This is a Join DM from "+member.guild.id+" ! \n \n"+msg_dm});
                  }catch(e){return}
    }

    async function blacklistFetch() {
            try{
            d= await db.get(`${members.guild.id}.USER.${members.user.id}.ECONOMY.money`)
            if(!d){await db.set(`${members.guild.id}.USER.${members.user.id}.ECONOMY.money`, 1) }

            var potential_blacklisted = db.get(`GLOBAL.BLACKLIST.${members.user.id}.blacklisted`)
            if(potential_blacklisted === "yes") { members.send({content: "You'r are been ban, because you are blacklisted"}).catch(members.ban({reason: 'blacklisted!'}))
            members.ban({reason: 'blacklisted!'})
            }else{ return};
          }catch{return}
    }
    await joinRoles(), joinDm(), blacklistFetch();
    }