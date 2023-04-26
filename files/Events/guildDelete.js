const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client, guild) => {    
    client.invites.delete(guild.id);

    await db.delete(`${guild.id}`);
    await db.delete(`${guild.id}`);
}