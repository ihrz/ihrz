const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const config = require('../config.json');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();
module.exports = async (client, message) => {
try{
        if(!message.guild) return;
        if(!message.author) return;
        if(message.author.id == client.user.id) return;
    
        async function snipeModules() {
            await db.set(`${message.guild.id}.GUILD.SNIPE.${message.channel.id}`, 
            {
                snipe: `${message.content}`, 
                snipeUserInfoTag: `${message.author.username} (${message.author.id} )`, 
                snipeUserInfoPp: `${message.author.displayAvatarURL()}`, 
                snipeTimestamp: Date.now()
            });
        };
        return snipeModules()
    
    
    }catch{ return };
};