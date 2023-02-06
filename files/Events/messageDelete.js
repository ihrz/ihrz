const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const config = require('../config.json');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();
module.exports = async (client, message) => {
    if(!message.guild) return;
    async function snipeModules() {
        await db.set(`snipe_${message.guild.id}_${message.channel}`, `${message.content}`), 
        await db.set(`snipeUserInfoTag_${message.guild.id}_${message.channel}`, `${message.author.username}`), 
        await db.set(`snipeUserInfoPp_${message.guild.id}_${message.channel}`, `${message.author.displayAvatarURL()}`);
        await db.set(`snipeTimestamp${message.guild.id}_${message.channel}`, Date.now())
    };
    return snipeModules();
};