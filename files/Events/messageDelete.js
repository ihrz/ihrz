const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const config = require('../config.json');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();
module.exports = async (client, message) => {
    if(!message.guild) return;
    async function snipeModules() {
        await db.set(`${message.guild.id}.GUILD.SNIPE.${message.channel.id}`, 
        {
            snipe: `${message.content}`, 
            snipeUserInfoTag: `${message.author.username} (${message.author.id} )`, 
            snipeUserInfoPp: `${message.author.displayAvatarURL()}`, 
            snipeTimestamp: Date.now()
        });
    };
    return snipeModules();
};