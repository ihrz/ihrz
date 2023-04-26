const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client, invite) => {
    client.invites.get(invite.guild.id).delete(invite.code);
}