
const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const config = require('../config.json');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client, reaction, user) => {
  async function reactionRole() {
    try {
      if (!reaction.message.guild) return;
      const fetched = await db.get(`${reaction.message.guildId}.GUILD.REACTION_ROLES.${reaction.message.id}.${reaction.emoji.name}`)
  
      if (fetched) {
        const role = reaction.message.guild.roles.cache.get(fetched.rolesID);
        if (!role) return;
  
        const member = reaction.message.guild.members.cache.get(user.id);
  
        return await member.roles.add(role);
      };
  
      const fetchedForNitro = await db.get(`${reaction.message.guildId}.GUILD.REACTION_ROLES.${reaction.message.id}.${reaction.emoji.id}`)
  
      if (fetchedForNitro) {
  
        const role = reaction.message.guild.roles.cache.get(fetchedForNitro.rolesID);
        if (!role) return;
  
        const member = reaction.message.guild.members.cache.get(user.id);
        return await member.roles.add(role);
      };
    } catch (e) { console.log(e) };
  }

  async function ticketModule() {
    if (user.bot) return;
    let result = await db.get(`${reaction.message.guildId}.GUILD.TICKET.${reaction.message.id}`)
    if (!result) return;
    if (result.channel !== reaction.message.channelId) return;
    if (result.messageID !== reaction.message.id) return;
  
    if (reaction.message.guild.channels.cache.find(channel => channel.name === `ticket-${user.id}`)) {
      return reaction.users.remove(user);
    }
    reaction.message.guild.channels.create({
      name: `ticket-${user.id}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: reaction.message.guild.roles.everyone,
          deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
        },
        {
          id: user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
        }
      ],
    }).then(async channel => {
      reaction.users.remove(user);
      let welcome = new EmbedBuilder()
        .setTitle(`${result.panelName}`)
        .setColor("#3b8f41")
        .setDescription(`Hi ${user.username}, welcome to your ticket! Please be patient, we will be with you shortly. If you would like to close this ticket please run \`/close\``)
        .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })
  
      return channel.send({ embeds: [welcome] });
    });
  }
  
  await reactionRole(), ticketModule();
}