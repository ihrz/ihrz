/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import { Client, Guild, Invite, PermissionsBitField } from 'pwss';

import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "inviteCreate",
    run: async (client: Client, invite: Invite) => {

        if (!invite.guild || !(invite.guild as Guild).members.me?.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;
        client.invites.get(invite.guild?.id)?.set(invite.code, invite.uses);

        let check = await client.db.get(`${invite.guild.id}.USER.${invite.inviter?.id}.INVITES`);

        if (!check) {
            await client.db.set(`${invite.guild.id}.USER.${invite.inviter?.id}.INVITES`,
                {
                    regular: 0, bonus: 0, leaves: 0, invites: 0
                }
            );
        };
    },
};