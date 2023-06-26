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

const { Collection, EmbedBuilder, PermissionsBitField, AuditLogEvent, Events, Client } = require('discord.js');
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main`);
const logger = require(`${process.cwd()}/src/core/logger`);

module.exports = async (client, member, members) => {
  let data = await getLanguageData(member.guild.id);

  async function memberCount() {
    try {
      const botMembers = member.guild.members.cache.filter(member => member.user.bot);
      const rolesCollection = member.guild.roles.cache;
      const rolesCount = rolesCollection.size;

      let bot = await DataBaseModel({ id: DataBaseModel.Get, key: `${member.guild.id}.GUILD.MCOUNT.bot` });
      let member_2 = await DataBaseModel({ id: DataBaseModel.Get, key: `${member.guild.id}.GUILD.MCOUNT.member` });
      let roles = await DataBaseModel({ id: DataBaseModel.Get, key: `${member.guild.id}.GUILD.MCOUNT.roles` });

      if (bot) {
        let joinmsgreplace = bot.name
          .replace("{rolescount}", rolesCount)
          .replace("{membercount}", member.guild.memberCount)
          .replace("{botcount}", botMembers.size);
        const fetched = member.guild.channels.cache.get(bot.channel);
        await fetched.edit({ name: joinmsgreplace }).then(response => { });
      }

      if (member_2) {
        let joinmsgreplace = member_2.name
          .replace("{rolescount}", rolesCount)
          .replace("{membercount}", member.guild.memberCount)
          .replace("{botcount}", botMembers.size);
        const fetched = member.guild.channels.cache.get(member_2.channel);
        await fetched.edit({ name: joinmsgreplace });
      }

      if (roles) {
        let joinmsgreplace = roles.name
          .replace("{rolescount}", rolesCount)
          .replace("{membercount}", member.guild.memberCount)
          .replace("{botcount}", botMembers.size);
        const fetched = member.guild.channels.cache.get(roles.channel);
        await fetched.edit({ name: joinmsgreplace });
      }
    } catch (e) { return }
  };

  async function goodbyeMessage() {
    try {
      let base = await DataBaseModel({ id: DataBaseModel.Get, key: `${member.guild.id}.USER.${member.user.id}.INVITES.BY` });
      let inviter = await client.users.fetch(base.inviter);

      let check = await DataBaseModel({ id: DataBaseModel.Get, key: `${member.guild.id}.USER.${inviter.id}.INVITES` });

      if (check) {
        await DataBaseModel({ id: DataBaseModel.Sub, key: `${member.guild.id}.USER.${inviter.id}.INVITES.invites`, values: 1 });
        await DataBaseModel({ id: DataBaseModel.Add, key: `${member.guild.id}.USER.${inviter.id}.INVITES.leaves`, values: 1 });
      };

      var invitesAmount = await DataBaseModel({ id: DataBaseModel.Get, key: `${member.guild.id}.USER.${inviter.id}.INVITES.invites` });
      var lChan = await DataBaseModel({ id: DataBaseModel.Get, key: `${member.guild.id}.GUILD.GUILD_CONFIG.leave` });
      if (!lChan) return;

      let joinMessage = await DataBaseModel({ id: DataBaseModel.Get, key: `${member.guild.id}.GUILD.GUILD_CONFIG.leavemessage` });
      if (!joinMessage) {
        return client.channels.cache.get(lChan).send({
          content: data.event_goodbye_inviter
            .replace("${member.id}", member.id)
            .replace("${member.guild.name}", member.guild.name)
            .replace("${inviter.tag}", inviter.tag)
            .replace("${fetched}", invitesAmount)
        });
      };

      var joinMessageFormated = joinMessage
        .replace("{user}", member.user.tag)
        .replace("{guild}", member.guild.name)
        .replace("{membercount}", member.guild.memberCount)
        .replace("{inviter}", inviter.tag)
        .replace("{invites}", invitesAmount);

      client.channels.cache.get(lChan).send({ content: joinMessageFormated });
    } catch (e) {
      logger.err(e);
      let lChan = await DataBaseModel({ id: DataBaseModel.Get, key: `${member.guild.id}.GUILD.GUILD_CONFIG.leave` });
      if (!lChan || !client.channels.cache.get(lChan)) return;

      return client.channels.cache.get(lChan).send({
        content: data.event_goodbye_default
          .replace("${member.id}", member.id)
          .replace("${member.guild.name}", member.guild.name)
      });
    }
  };

  async function serverLogs() {
    if (!member.guild) return;
    if (!member.guild.members.me) return;
    if (!member.guild.members.me.permissions.has([PermissionsBitField.Flags.ViewAuditLog])) return;

    const fetchedLogs = await member.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberKick,
      limit: 1,
    });

    const firstEntry = fetchedLogs.entries.first();
    if (!firstEntry || !firstEntry.target || member.id !== firstEntry.target.id) return;

    const someinfo = await DataBaseModel({ id: DataBaseModel.Get, key: `${member.guild.id}.GUILD.SERVER_LOGS.moderation` });
    if (!someinfo) return;

    let Msgchannel = client.channels.cache.get(someinfo);
    if (!Msgchannel) return;

    let logsEmbed = new EmbedBuilder()
      .setColor("#000000")
      .setDescription(data.event_srvLogs_guildMemberRemove_description
        .replace("${firstEntry.executor.id}", firstEntry.executor.id)
        .replace("${firstEntry.target.id}", firstEntry.target.id)
      )
      .setTimestamp();

    await Msgchannel.send({ embeds: [logsEmbed] });
  };

  await memberCount(), goodbyeMessage(), serverLogs();
};