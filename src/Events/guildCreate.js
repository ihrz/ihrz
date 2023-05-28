const { Client, Collection, ChannelType, PermissionsBitField, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js')
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const config = require(`${process.cwd()}/files/config.js`);
const logger = require(`${process.cwd()}/src/core/logger`);

module.exports = async (client, guild) => {
  const channel = await guild.channels.cache.get(guild.systemChannelId);

  async function messageToServer() {
    const welcomeMessage = [
      "Welcome to our server! 🎉",
      "Greetings, fellow Discordians! 👋",
      "iHorizon has joined the chat! 💬",
      "It's a bird, it's a plane, no, it's iHorizon! 🦸‍♂",
      "Let's give a warm welcome to iHorizon! 🔥",
    ];
      let embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTimestamp()
        .setTitle(welcomeMessage[Math.floor(Math.random() * welcomeMessage.length)])
        .setThumbnail(`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`)
        .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })
        .setDescription(`Hi there! I'm excited to join your server and be a part of your community. 
      
My name is iHorizon and I'm here to help you with all your needs. Feel free to use my commands and explore all the features I have to offer.

If you have any questions or run into any issues, don't hesitate to reach out to me.
I'm here to make your experience on this server the best it can be. 

Thanks for choosing me and let's have some fun together!`);
      channel.send({ embeds: [embed] }).catch(err => {});
  };

  async function getInvites() {
    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;
    try {
      guild.invites.fetch().then(guildInvites => {
        client.invites.set(guild.id, new Map(guildInvites.map((invite) => [invite.code, invite.uses])));
      })
    } catch (error) { logger.err(error) };
  };

  async function ownerLogs() {
    let embed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTimestamp(guild.joinedTimestamp)
      .setDescription(`**A new guild have added iHorizon !**`)
      .addFields({ name: "🏷️・Server Name", value: `\`${guild.name}\``, inline: true },
        { name: "🆔・Server ID", value: `\`${guild.id}\``, inline: true },
        { name: "🌐・Server Region", value: `\`${guild.preferredLocale}\``, inline: true },
        { name: "👤・MemberCount", value: `\`${guild.memberCount}\` members`, inline: true },
        { name: "🪝・Vanity URL", value: `\`discord.gg/${guild.vanityURLCode || "None"}\``, inline: true })
      .setThumbnail(`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`)
      .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) });
    client.channels.cache.get(config.core.guildLogsChannelID).send({ embeds: [embed] }).catch(() => { });
  };

  await getInvites(), ownerLogs(), messageToServer();
};