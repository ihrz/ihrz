const { Client, Intents, Collection, EmbedBuilder, Permissions, PermissionsBitField } = require('discord.js');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client, invite) => {

  async function inviteManager() {
    if (!invite.guild.members.me.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;
    client.invites.get(invite.guild.id).set(invite.code, invite.uses);

    await db.set(`${invite.guild.id}.GUILD.INVITES.${invite.code}`, {
      creatorUser: `${invite.inviter.id}`, inviterId: invite.inviter?.id,
      code: invite.code, uses: invite.uses
    });

    await db.set(`${invite.guild.id}.USER.${invite.inviter.id}.INVITES.${invite.code}`, {
      creatorUser: `${invite.inviter.id}`, inviteCode: `${invite.code}`,
      guildID: `${invite.guild.id}`, invitesAmount: 0
    });

    let check = await db.get(`${invite.guild.id}.USER.${invite.inviter.id}.INVITES.DATA`);

    if (!check) {
      await db.set(`${invite.guild.id}.USER.${invite.inviter.id}.INVITES.DATA`, {
        regular: 0, bonus: 0, leaves: 0, invites: 0
      });
    }
  };

  await inviteManager();
};