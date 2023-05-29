const { Client, Intents, Collection, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const logger = require(`${process.cwd()}/src/core/logger`);

const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

module.exports = async (client, message) => {
  if (!message.guild || message.author.bot) return;
  let data = await getLanguageData(message.guild.id);
  async function xpFetcher() {
    if (!message.guild) return; if (message.channel.type !== ChannelType.GuildText) return; if (message.author.bot) return;
    const randomNumber = Math.floor(Math.random() * 100) + 50;
    await db.add(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xp`, randomNumber); await db.add(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xptotal`, randomNumber);

    var level = await db.get(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.level`) || 1; var xp = await db.get(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xp`);
    var xpNeeded = level * 500;
    if (xpNeeded < xp) {
      await db.add(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.level`, 1);
      var newLevel = await db.get(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.level`, 1); await db.sub(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xp`, xpNeeded);
      let xp_turn = await db.get(`${message.guild.id}.GUILD.XP_LEVELING.on_or_off`);
      if (xp_turn === "off") { return };

      if (!message.channel.permissionsFor(client.user).has(PermissionsBitField.Flags.SendMessages)) return; let xpChan = await db.get(`${message.guild.id}.GUILD.XP_LEVELING.xpchannels`);
      if (!xpChan) return message.channel.send({
        content: data.event_xp_level_earn
          .replace("${message.author.id}", message.author.id)
          .replace("${newLevel}", newLevel)
      }).then((sent) => {
        setTimeout(() => {
          sent.delete();
        }, 6500);
      })
      if (xpChan === "off") return message.channel.send({
        content: data.event_xp_level_earn
          .replace("${message.author.id}", message.author.id)
          .replace("${newLevel}", newLevel)
      }).then((sent) => {
        setTimeout(() => {
          sent.delete();
        }, 6500);
      })
      try {
        client.channels.cache.get(xpChan).send({
          content: data.event_xp_level_earn
            .replace("${message.author.id}", message.author.id)
            .replace("${newLevel}", newLevel)
        })
      } catch (e) { return };
    }
  };

  async function EconomyDebug() {
    if (!message.guild) return; if (message.channel.type !== ChannelType.GuildText) return; if (message.author.bot) return; if (message.author.id == client.user.id) return;
    d = await db.get(`${message.guild.id}.USER.${message.author.id}.ECONOMY.money`);
    if (!d) { return await db.set(`${message.guild.id}.USER.${message.author.id}.ECONOMY.money`, 0) };
  };

  async function logsMessage() {
    if (!message.guild) return; if (message.channel.type !== ChannelType.GuildText) return; if (message.author.bot) return; if (message.author.id == client.user.id) return;
    const now = new Date();
    const CreateFiles = fs.createWriteStream('./files/logs/message/' + message.guild.id + ".txt", { flags: 'a' });
    let i = message.guild.name + " | MESSAGE | [" + now + "]" + " \n " + message.author.id + ": " + message.content + " " + " in: #" + message.channel.name + "";
    CreateFiles.write(i.toString() + '\r\n');
  };

  async function blockSpam() {
    if (!message.guild || message.channel.type !== ChannelType.GuildText || message.author.bot || message.author.id === client.user.id) {
      return;
    }

    const guildId = message.guild.id;
    const type = await db.get(`${guildId}.GUILD.GUILD_CONFIG.antipub`);
    if (type === "off" || message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return;
    }

    if (type === "on") {
      const LOG = await db.get(`${guildId}.GUILD.PUNISH.PUNISH_PUB`);
      const LOGfetched = await db.get(`TEMP.${guildId}.PUNISH_DATA.${message.author.id}`);

      if (LOGfetched && LOG && LOG.amountMax === LOGfetched.flags && LOG.state === "true") {
        switch (LOG.punishementType) {
          case 'ban':
            message.guild.members.ban(message.author.id, { reason: "Ban by PUNISHPUB" }).catch(() => { });
            break;
          case 'kick':
            message.guild.members.kick(message.author.id, { reason: "Kick by PUNISHPUB" }).catch(() => { });
            break;
          case 'mute':
            const muterole = message.guild.roles.cache.find(role => role.name === 'muted');
            if (muterole) {
              const member = message.guild.members.cache.get(message.author.id);
              await member.roles.add(muterole.id).catch(err => { });
              setTimeout(() => {
                if (member.roles.cache.has(muterole.id)) {
                  member.roles.remove(muterole.id);
                }
                db.set(`TEMP.${guildId}.PUNISH_DATA.${message.author.id}`, {});
              }, 40000);
            }
            break;
        }
      }

      try {
        const blacklist = ["https://", "http://", "://", ".com", ".xyz", ".fr", "www.", ".gg", "g/", ".gg/", "youtube.be", "/?"];
        const contentLower = message.content.toLowerCase();

        for (const word of blacklist) {
          if (contentLower.includes(word)) {
            let FLAGS_FETCH = await db.get(`TEMP.${guildId}.PUNISH_DATA.${message.author.id}.flags`);
            FLAGS_FETCH = FLAGS_FETCH || 0;
            await db.set(`TEMP.${guildId}.PUNISH_DATA.${message.author.id}`, { flags: FLAGS_FETCH + 1 });
            await message.delete();
            break;
          }
        }
      } catch (e) {
        logger.err(e);
      }
    }
  };

  await xpFetcher(), EconomyDebug(), logsMessage(), blockSpam();
};