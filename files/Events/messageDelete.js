const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const config = require('../config.json');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();
module.exports = async (client, message) => {
    async function snipeModules() {
        db.set(`snipe_${message.guild.id}_${message.channel}`, `${message.content}`), 
        db.set(`snipeUserInfoTag_${message.guild.id}_${message.channel}`, `${message.author.username}`), 
        db.set(`snipeUserInfoPp_${message.guild.id}_${message.channel}`, `${message.author.displayAvatarURL()}`);
        db.set(`snipeTimestamp${message.guild.id}_${message.channel}`, Date.now())
    }
    return snipeModules();
};