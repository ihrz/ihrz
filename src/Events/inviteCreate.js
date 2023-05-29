const { Client, Intents, Collection, EmbedBuilder, Permissions, PermissionsBitField } = require('discord.js');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const { DataBaseModel } = require(`${process.cwd()}/files/ihorizon-api/main`);

module.exports = async (client, invite) => {
  async function inviteManager() {
    if (!invite.guild.members.me.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;
    client.invites.get(invite.guild.id).set(invite.code, invite.uses);

    await new DataBaseModel({
      id: DataBaseModel.Set, key: `${invite.guild.id}.GUILD.INVITES.${invite.code}`, value: {
        creatorUser: `${invite.inviter.id}`, inviterId: invite.inviter?.id,
        code: invite.code, uses: invite.uses
      }
    });

    await new DataBaseModel({
      id: DataBaseModel.Set, key: `${invite.guild.id}.USER.${invite.inviter.id}.INVITES.${invite.code}`, value:
      {
        creatorUser: `${invite.inviter.id}`, inviteCode: `${invite.code}`,
        guildID: `${invite.guild.id}`, invitesAmount: 0
      }
    });


    let check = await new DataBaseModel({ id: DataBaseModel.Get, key: `${invite.guild.id}.USER.${invite.inviter.id}.INVITES.DATA` });

    if (!check.data) {
      await new DataBaseModel({
        id: DataBaseModel.Get, key: `${invite.guild.id}.USER.${invite.inviter.id}.INVITES.DATA`, value: {
          regular: 0, bonus: 0, leaves: 0, invites: 0
        }
      });
    }
  };

  await inviteManager();
};