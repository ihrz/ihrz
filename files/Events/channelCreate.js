const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const config = require('../config.json');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client, channel) => {
if(channel.name === "ihorizon-logs") {
    let logchannel = channel.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
        let setup_embed = new EmbedBuilder()
        .setColor("#1e1d22")
        .setTitle("Succefully setup !")
        .setDescription("The bot has been set up perfectly. You don't need to do anything (zen) anymore. \n \n All moderation logs related to iHorizon will be displayed here")
    return logchannel.send({embeds: [setup_embed]})
}};