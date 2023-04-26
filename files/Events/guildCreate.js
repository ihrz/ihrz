const { Client, Collection, ChannelType, PermissionFlagsBits, PermissionsBitField, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js')
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client, guild) => {    
    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;

    try {
      guild.invites.fetch().then(guildInvites => {
        client.invites.set(guild.id, new Map(guildInvites.map((invite) => [invite.code, invite.uses])));
      })
    } catch (error) { }
}