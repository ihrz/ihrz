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

import { Client, PermissionsBitField, Presence } from 'pwss';

import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "presenceUpdate",
    run: async (client: Client, oldPresence: Presence, newPresence: Presence) => {

        if (!newPresence.guild?.members.me?.permissions.has([PermissionsBitField.Flags.ManageRoles])) return;
        if (!oldPresence || !oldPresence.guild) return;

        let someinfo = await client.db.get(`${oldPresence.guild.id}.GUILD.SUPPORT`);

        if (!someinfo) { return; };

        let bio = newPresence.activities[0] || 'null';
        let vanity = oldPresence.guild.vanityURLCode || 'null';

        let fetchedUser = oldPresence.guild.members.cache.get(oldPresence.userId);
        let fetchedRoles = newPresence.guild.roles.cache.get(someinfo.rolesId);
        if (!fetchedUser || !fetchedRoles || newPresence.guild.members.me.roles.highest.position < fetchedRoles.rawPosition || newPresence.status === 'offline') {
            return;
        };

        if (!bio.state) {
            if (fetchedUser?.roles.cache.has(someinfo.rolesId)) return fetchedUser.roles.remove(someinfo.rolesId);
            return;
        };

        if (
            bio.state?.toString().toLowerCase().includes(someinfo.input.toString().toLowerCase())
            || bio.state?.toString().toLowerCase().includes(vanity.toString().toLowerCase())
        ) {
            return fetchedUser?.roles.add(someinfo.rolesId).catch(() => { });
        } else {
            return fetchedUser?.roles.remove(someinfo.rolesId).catch(() => { });
        };
    },
};