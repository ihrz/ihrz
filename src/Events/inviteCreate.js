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

const { Client, Intents, Collection, EmbedBuilder, Permissions, PermissionsBitField } = require('discord.js');
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main`);

module.exports = async (client, invite) => {
    
    async function inviteManager() {
        if (!invite.guild || !invite.guild.members.me.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;

        await client.invites.get(invite.guild.id).set(invite.code, invite.uses);
        if (!invite.inviter.id) console.log("inviteCreate.js\n"+invite.inviter)
        
        let check = await DataBaseModel({
            id: DataBaseModel.Get, key: `${invite.guild.id}.USER.${invite.inviter.id}.INVITES`
        });

        if (!check) {
            await DataBaseModel({
                id: DataBaseModel.Set, key: `${invite.guild.id}.USER.${invite.inviter.id}.INVITES`, value: {
                    regular: 0, bonus: 0, leaves: 0, invites: 0
                }
            });
        };
    };

    await inviteManager();
};