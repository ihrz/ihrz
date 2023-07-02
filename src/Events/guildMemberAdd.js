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

const { Client, Intents, Collection, EmbedBuilder, PermissionsBitField } = require(`${process.cwd()}/files/ihorizonjs`);
const logger = require(`${process.cwd()}/src/core/logger`);
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);

module.exports = async (client, member, members) => {
  let data = await getLanguageData(member.guild.id);
  async function joinRoles() {
    if (!member.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;

    let roleid = await DataBaseModel({ id: DataBaseModel.Get, key: `${member.guild.id}.GUILD.GUILD_CONFIG.joinroles` });
    let role = member.guild.roles.cache.get(roleid);
    if (!roleid || !role) return;

    member.roles.add(roleid);
  };

  async function joinDm() {
    try {
      let msg_dm = await DataBaseModel({ id: DataBaseModel.Get, key: `${member.guild.id}.GUILD.GUILD_CONFIG.joindm` });

      if (!msg_dm || msg_dm === "off") return;
      member.send({ content: "**This is a Join DM from** \`" + member.guild.id + "\`**!**\n" + msg_dm });
    } catch { return; };
  };

  async function blacklistFetch() {
    try {
      let d = await DataBaseModel({ id: DataBaseModel.Get, key: `${members.guild.id}.USER.${members.user.id}.ECONOMY.money` });

      if (!d) {
        await DataBaseModel({ id: DataBaseModel.Add, key: `${members.guild.id}.USER.${members.user.id}.ECONOMY.money`, value: 1 });
      }

      let e = await DataBaseModel({ id: DataBaseModel.Get, key: `GLOBAL.BLACKLIST.${members.user.id}.blacklisted` });

      if (e) {
        members.send({ content: "You've been banned, because you are blacklisted" }).catch(members.ban({ reason: 'blacklisted!' })).catch(() => { });
        members.ban({ reason: 'blacklisted!' });
      }
    } catch { return; };
  };

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
        await fetched.edit({ name: joinmsgreplace });
      }

      if (member_2) {
        let joinmsgreplace = member_2.name
          .replace("{rolescount}", rolesCount)
          .replace("{membercount}", member.guild.memberCount)
          .replace("{botcount}", botMembers.size);
        const fetched = member.guild.channels.cache.get(member_2.channel);
        await fetched.edit({ name: joinmsgreplace })
      }

      if (roles) {
        let joinmsgreplace = roles.name
          .replace("{rolescount}", rolesCount)
          .replace("{membercount}", member.guild.memberCount)
          .replace("{botcount}", botMembers.size);

        const fetched = member.guild.channels.cache.get(roles.channel);
        await fetched.edit({ name: joinmsgreplace });
      }
    } catch (e) { return };
  };

  function isVanity(invite) {
    return member.guild.features.includes("VANITY_URL") && invite.code == member.guild.vanityURLCode;
  };

  async function welcomeMessage() {
    try {
      const oldInvites = client.invites.get(member.guild.id);
      const newInvites = await member.guild.invites.fetch();

      const invite = newInvites.find(i => i.uses > oldInvites.get(i.code));
      const inviter = await client.users.fetch(invite.inviter);

      client.invites.get(member.guild.id).set(invite.code, invite.uses);

      let check = await DataBaseModel({ id: DataBaseModel.Get, key: `${invite.guild.id}.USER.${inviter.id}.INVITES` });

      if (check) {
        await DataBaseModel({ id: DataBaseModel.Add, key: `${invite.guild.id}.USER.${inviter.id}.INVITES.regular`, value: 1 });
        await DataBaseModel({ id: DataBaseModel.Add, key: `${invite.guild.id}.USER.${inviter.id}.INVITES.invites`, value: 1 });
      };

      await DataBaseModel({
        id: DataBaseModel.Set, key: `${invite.guild.id}.USER.${member.user.id}.INVITES.BY`,
        value: {
          inviter: inviter.id,
          invite: invite.code,
        }
      });

      var invitesAmount = await DataBaseModel({ id: DataBaseModel.Get, key: `${member.guild.id}.USER.${inviter.id}.INVITES.invites` });

      let wChan = await DataBaseModel({ id: DataBaseModel.Get, key: `${member.guild.id}.GUILD.GUILD_CONFIG.join` });
      if (!wChan || !client.channels.cache.get(wChan)) return;

      let joinMessage = await DataBaseModel({ id: DataBaseModel.Get, key: `${member.guild.id}.GUILD.GUILD_CONFIG.joinmessage` });

      if (!joinMessage) {
        return client.channels.cache.get(wChan).send({
          content: data.event_welcomer_inviter
            .replace("${member.id}", member.id)
            .replace("${member.user.createdAt.toLocaleDateString()}", member.user.createdAt.toLocaleDateString())
            .replace("${member.guild.name}", member.guild.name)
            .replace("${inviter.tag}", inviter.username)
            .replace("${fetched}", invitesAmount)
        });
      }

      var joinMessageFormated = joinMessage
        .replace("{user}", member.user.username)
        .replace("{guild}", member.guild.name)
        .replace("{createdat}", member.user.createdAt.toLocaleDateString())
        .replace("{membercount}", member.guild.memberCount)
        .replace("{inviter}", inviter.username)
        .replace("{invites}", invitesAmount);

      return client.channels.cache.get(wChan).send({ content: joinMessageFormated });
    } catch {
      let wChan = await DataBaseModel({ id: DataBaseModel.Get, key: `${member.guild.id}.GUILD.GUILD_CONFIG.join` });
      if (!wChan || !client.channels.cache.get(wChan)) return;

      return client.channels.cache.get(wChan).send({
        content: data.event_welcomer_default
          .replace("${member.id}", member.id)
          .replace("${member.user.createdAt.toLocaleDateString()}", member.user.createdAt.toLocaleDateString())
          .replace("${member.guild.name}", member.guild.name)
      });
    }
  };

  await joinRoles(), joinDm(), blacklistFetch(), memberCount(), welcomeMessage();
};