/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

const { Client, Intents, Collection, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const logger = require(`${process.cwd()}/src/core/logger`);

const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main`);


module.exports = async (client, message) => {
  if (!message.guild || message.author.bot) return;
  if (!message.channel) return;

  let data = await getLanguageData(message.guild.id);

  async function xpFetcher() {
    if (!message.guild || message.author.bot) return;
    if (message.channel.type !== ChannelType.GuildText) return;

    const randomNumber = Math.floor(Math.random() * 100) + 50;

    await DataBaseModel({ id: DataBaseModel.Add, key: `${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xp`, value: randomNumber });
    await DataBaseModel({ id: DataBaseModel.Add, key: `${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xptotal`, value: randomNumber });

    var xp = await DataBaseModel({ id: DataBaseModel.Get, key: `${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xp` });
    var level = await DataBaseModel({ id: DataBaseModel.Get, key: `${message.guild.id}.USER.${message.author.id}.XP_LEVELING.level` }) || 1;

    var xpNeeded = level * 500;

    if (xpNeeded < xp) {

      await DataBaseModel({ id: DataBaseModel.Add, key: `${message.guild.id}.USER.${message.author.id}.XP_LEVELING.level`, value: 1 });
      await DataBaseModel({ id: DataBaseModel.Sub, key: `${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xp`, value: xpNeeded });

      let newLevel = await DataBaseModel({ id: DataBaseModel.Get, key: `${message.guild.id}.USER.${message.author.id}.XP_LEVELING.level` });

      let xpTurn = await DataBaseModel({ id: DataBaseModel.Get, key: `${message.guild.id}.GUILD.XP_LEVELING.on_or_off` });

      if (xpTurn === "off") { return };

      if (!message.channel.permissionsFor(client.user).has(PermissionsBitField.Flags.SendMessages)) return;

      let xpChan = await DataBaseModel({ id: DataBaseModel.Get, key: `${message.guild.id}.GUILD.XP_LEVELING.xpchannels` });

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
      } catch (e) { return console.error(e) };
    }
  };

  async function EconomyDebug() {
    if (!message.guild || !message.channel) return;
    if (message.channel.type !== ChannelType.GuildText) return;

    if (message.author.bot) return;
    if (message.author.id === client.user.id) return;

    d = await db.get(`${message.guild.id}.USER.${message.author.id}.ECONOMY.money`);
    if (!d) { return await db.set(`${message.guild.id}.USER.${message.author.id}.ECONOMY.money`, 0); };
  };

  async function logsMessage() {
    if (!message.guild || !message.channel) return;
    if (message.channel.type !== ChannelType.GuildText) return;

    if (message.author.bot) return;
    if (message.author.id === client.user.id) return;

    const now = new Date();
    const CreateFiles = fs.createWriteStream('./files/logs/message/' + message.guild.id + ".txt", { flags: 'a' });
    let i = message.guild.name + " | MESSAGE | [" + now + "]" + " \n " + message.author.id + ": " + message.content + " " + " in: #" + message.channel.name + "";
    CreateFiles.write(i.toString() + '\r\n');
  };

  async function blockSpam() {
    if (!message.guild || !message.channel || !message.member || message.channel.type !== ChannelType.GuildText || message.author.bot || message.author.id === client.user.id) {
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
              setTimeout(async () => {
                if (member.roles.cache.has(muterole.id)) {
                  member.roles.remove(muterole.id);
                }
                await db.set(`TEMP.${guildId}.PUNISH_DATA.${message.author.id}`, {});
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

  async function rankRole() {
    if (!message.guild || !message.channel || message.channel.type !== ChannelType.GuildText || message.author.bot || message.author.id === client.user.id) {
      return;
    }

    if (!message.channel.permissionsFor(client.user).has(PermissionsBitField.Flags.SendMessages)) return;
    if (!message.channel.permissionsFor(client.user).has(PermissionsBitField.Flags.ManageRoles)) return;

    let check = message.mentions.users.find(user => user.id === client.user.id);

    if (check) {
      let dbGet = await DataBaseModel({ id: DataBaseModel.Get, key: `${message.guild.id}.GUILD.RANK_ROLES.roles` });
      let fetch = message.guild.roles.cache.find(role => role.id === dbGet);

      if (fetch) {
        let target = message.guild.members.cache.get(message.author.id);

        if (target.roles.cache.has(fetch.id)) { return; };

        let embed = new EmbedBuilder()
          .setDescription(data.event_rank_role
            .replace("${message.author.id}", message.author.id)
            .replace("${fetch.id}", fetch.id)
          )
          .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })
          .setTimestamp();

        message.member.roles.add(fetch).catch(() => { });
        message.channel.send({ embeds: [embed] });
      }
    }
  };

  await xpFetcher(), EconomyDebug(), logsMessage(), blockSpam(), rankRole();
};