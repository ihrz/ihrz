
const { Collection, EmbedBuilder, PermissionsBitField, AuditLogEvent, Events, Client } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

module.exports = async (client, member, members) => {
  let data = await getLanguageData(member.guild.id);
  async function memberCount() {
    try {
      const botMembers = member.guild.members.cache.filter(member => member.user.bot);
      const rolesCollection = member.guild.roles.cache;
      const rolesCount = rolesCollection.size;

      let bot = await db.get(`${member.guild.id}.GUILD.MCOUNT.bot`);
      let member_2 = await db.get(`${member.guild.id}.GUILD.MCOUNT.member`);
      let roles = await db.get(`${member.guild.id}.GUILD.MCOUNT.roles`);

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
      const newInvites = await member.guild.invites.fetch();
      const oldInvites = client.invites.get(member.guild.id);
      const invite = newInvites.find(i => i.uses > oldInvites.get(i.code));
      let tempDB = await db.get(`${member.guild.id}.GUILD.INVITES.${invite.code}.creatorUser`);
      const inviter = await client.users.fetch(tempDB);
      if (db.get(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA`)) {
        await db.sub(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA.invites`, 1);
        await db.add(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA.leaves`, 1);
      }
      let fetched = await db.get(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA.invites`);

      let wChan = await db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leave`);
      if (wChan == null || !wChan) return;

      let messssssage = await db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leavemessage`);
      if (!messssssage) {
        return client.channels.cache.get(wChan).send({
          content: data.event_goodbye_inviter
            .replace("${member.id}", member.id)
            .replace("${member.guild.name}", member.guild.name)
            .replace("${inviter.tag}", inviter.tag)
            .replace("${fetched}", fetched)
        });
      }

      var messssssage4 = messssssage
        .replace("{user}", member.user.tag)
        .replace("{guild}", member.guild.name)
        .replace("{membercount}", member.guild.memberCount)
        .replace("{inviter}", inviter.tag)
        .replace("{invites}", fetched);
      client.channels.cache.get(wChan).send({ content: `${messssssage4}` });
    } catch (e) {
      let wChan = await db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leave`);
      if (!wChan) return;

      return client.channels.cache.get(wChan).send({
        content: data.event_goodbye_default
          .replace("${member.id}", member.id)
          .replace("${member.guild.name}", member.guild.name)
      });
    }
  };

  async function serverLogs() {

    if (!member.guild.members.me.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;

    const fetchedLogs = await member.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberKick,
      limit: 1,
    });
    const firstEntry = fetchedLogs.entries.first();
    if (!member.guild) return;
    const someinfo = await db.get(`${member.guild.id}.GUILD.SERVER_LOGS.moderation`);
    if (!someinfo) return;

    let logsEmbed = new EmbedBuilder()
      .setColor("#000000")
      .setDescription(data.event_srvLogs_guildMemberRemove_description
        .replace("${firstEntry.executor.id}", firstEntry.executor.id)
        .replace("${firstEntry.target.id}", firstEntry.target.id)
      )
      .setTimestamp();

    await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
  }
  await memberCount(), goodbyeMessage(), serverLogs();
};