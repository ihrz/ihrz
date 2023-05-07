
const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const config = require('../config.json');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const logger = require(`${process.cwd()}/files/core/logger`);

module.exports = async (client, reaction, user) => {
  try {

    if (!reaction.message.guild) return;
    const fetched = await db.get(`${reaction.message.guildId}.GUILD.REACTION_ROLES.${reaction.message.id}.${reaction.emoji.name}`)

    if (fetched) {

      const role = reaction.message.guild.roles.cache.get(fetched.rolesID);
      if (!role) return;

      const member = reaction.message.guild.members.cache.get(user.id);
      return await member.roles.remove(role);
    };

    const fetchedForNitro = await db.get(`${reaction.message.guildId}.GUILD.REACTION_ROLES.${reaction.message.id}.${reaction.emoji.id}`)

    if (fetchedForNitro) {

      const role = reaction.message.guild.roles.cache.get(fetchedForNitro.rolesID);
      if (!role) return;

      const member = reaction.message.guild.members.cache.get(user.id);
      return await member.roles.remove(role);
    };
  } catch (e) { logger.err(e) };
}