
const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const yaml = require('js-yaml');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);

module.exports = async (client, member, members) => {
  let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(member.guild.id)}.yml`, 'utf-8');
  let data = yaml.load(fileContents);

  async function memberCount() {
    try {
      const botMembers = member.guild.members.cache.filter(member => member.user.bot);
      const rolesCollection = member.guild.roles.cache;
      const rolesCount = rolesCollection.size;

      let bot = await db.get(`${member.guild.id}.GUILD.MCOUNT.bot`)
      let member_2 = await db.get(`${member.guild.id}.GUILD.MCOUNT.member`)
      let roles = await db.get(`${member.guild.id}.GUILD.MCOUNT.roles`)

      if (bot) {
        let joinmsgreplace = bot.name
          .replace("{rolescount}", rolesCount)
          .replace("{membercount}", member.guild.memberCount)
          .replace("{botcount}", botMembers.size)

        const fetched = member.guild.channels.cache.get(bot.channel);
        await fetched.edit({ name: joinmsgreplace }).then(response => { })
      }

      if (member_2) {
        let joinmsgreplace = member_2.name
          .replace("{rolescount}", rolesCount)
          .replace("{membercount}", member.guild.memberCount)
          .replace("{botcount}", botMembers.size)

        const fetched = member.guild.channels.cache.get(member_2.channel);
        await fetched.edit({ name: joinmsgreplace })
      }

      if (roles) {
        let joinmsgreplace = roles.name
          .replace("{rolescount}", rolesCount)
          .replace("{membercount}", member.guild.memberCount)
          .replace("{botcount}", botMembers.size)

        const fetched = member.guild.channels.cache.get(roles.channel);
        await fetched.edit({ name: joinmsgreplace })
      }
    } catch (e) { return };
  };

  async function goodbyeMessage() {
    try {
      const newInvites = await member.guild.invites.fetch()
      const oldInvites = client.invites.get(member.guild.id);
      const invite = newInvites.find(i => i.uses > oldInvites.get(i.code));
      console.log(invite.code);
      let tempDB = await db.get(`${member.guild.id}.GUILD.INVITES.${invite.code}.creatorUser`);

      const inviter = await client.users.fetch(tempDB);

      console.log(inviter);

      let checked = db.get(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA`);

      if (checked) {
        await db.sub(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA.invites`, 1);
        await db.add(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA.leaves`, 1);
      }
      let fetched = await db.get(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA.invites`);

      let wChan = await db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leave`);
      if (wChan == null || !wChan) return;

      let messssssage = await db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leavemessage`)
      if (!messssssage) {
        return client.channels.cache.get(wChan).send({
          content: data.event_goodbye_inviter
            .replace("${member.id}", member.id)
            .replace("${member.guild.name}", member.guild.name)
            .replace("${inviter.tag}", inviter.tag)
            .replace("${fetched}", fetched)
        })
      }

      var messssssage4 = messssssage
        .replace("{user}", member.user.tag)
        .replace("{guild}", member.guild.name)
        .replace("{membercount}", member.guild.memberCount)
        .replace("{inviter}", inviter.tag)
        .replace("{invites}", fetched)

      client.channels.cache.get(wChan).send({ content: `${messssssage4}` })
    } catch (e) {
      console.log(e)
      let wChan = await db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leave`)
      if (wChan == null) return;
      if (!wChan) return;

      return client.channels.cache.get(wChan).send({
        content: data.event_goodbye_default
          .replace("${member.id}", member.id)
          .replace("${member.guild.name}", member.guild.name)
      });
    }
  };

  await memberCount(), goodbyeMessage();
};