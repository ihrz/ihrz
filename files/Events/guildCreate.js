const { Client, Collection, ChannelType, PermissionFlagsBits, PermissionsBitField, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js')
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const config = require(`${process.cwd()}/files/config.js`)

module.exports = async (client, guild) => {
  const channel = await guild.channels.cache.get(guild.systemChannelId);

  async function messageToServer() {
    const welcomeMessage = ["Welcome to our server! 🎉", "Greetings, fellow Discordians! 👋",
      "iHorizon has joined the chat! 💬", "It's a bird, it's a plane, no, it's iHorizon! 🦸‍♂", "Let's give a warm welcome to iHorizon! 🔥"]
    const index = Math.floor(Math.random() * welcomeMessage.length);
    const title = welcomeMessage[index];

    if (guild.memberCount < 10) {
      let embed = new EmbedBuilder()
        .setColor("#f44336")
        .setTimestamp()
        .setThumbnail(`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`)
        .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })
        .setDescription(`Dear members of this server,
We regret to inform you that our bot will be leaving this server. We noticed that this server has less than 10 members, which may suggest that it is not an active and healthy community for our bot to be a part of.
We value the safety and satisfaction of our users, and we believe that being part of active and thriving communities is essential to achieving this goal. We apologize for any inconvenience this may cause and we hope to have the opportunity to serve you in a more suitable environment in the future.
      
Thank you for your understanding and have a great day.

Best regards,
iHorizon Project`);

      channel.send({ embeds: [embed] });
      return guild.leave();
    } else {
      let embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTimestamp()
        .setTitle(title)
        .setThumbnail(`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`)
        .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })
        .setDescription(`Hi there! I'm excited to join your server and be a part of your community. 
      
My name is iHorizon and I'm here to help you with all your needs. Feel free to use my commands and explore all the features I have to offer.

If you have any questions or run into any issues, don't hesitate to reach out to me.
I'm here to make your experience on this server the best it can be. 

Thanks for choosing me and let's have some fun together!`);

      channel.send({ embeds: [embed] }).catch(err => {});
    }
  };

  async function getInvites() {
    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;
    try {
      guild.invites.fetch().then(guildInvites => {
        client.invites.set(guild.id, new Map(guildInvites.map((invite) => [invite.code, invite.uses])));
      })
    } catch (error) { console.log(error) };
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
      .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })

    client.channels.cache.get(config.guildLogsChannelID).send({ embeds: [embed] }).catch(() => { });
  };

  await getInvites(), ownerLogs(), messageToServer();
}