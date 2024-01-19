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

import { Client, Collection, EmbedBuilder, Guild, GuildApplicationCommandManager, GuildMember, PermissionsBitField, Presence, PresenceManager, Role, RoleManager, User, UserManager } from 'discord.js';

export default async (client: Client, oldPresence: Presence, newPresence: Presence) => {

    if (!newPresence.guild?.members.me?.permissions.has([PermissionsBitField.Flags.ManageRoles])) return;
    if (!oldPresence || !oldPresence.guild) return;

    let someinfo = await client.db.get(`${oldPresence.guild.id}.GUILD.SUPPORT`);

    if (!someinfo) { return; };

    let bio = newPresence.activities[0] || 'null';
    let vanity = oldPresence.guild.vanityURLCode || 'null';

    let fetchedUser = await oldPresence.guild.members.cache.get(oldPresence.userId);
    let fetchedRoles = await newPresence.guild.roles.cache.get(someinfo.rolesId);

    if (!fetchedUser || !fetchedRoles) return;

    if (newPresence.guild.members.me.roles.highest.position < fetchedRoles.rawPosition) {
        return;
    };

    if (!bio.state) {
        if (fetchedUser?.roles.cache.has(someinfo.rolesId)) return fetchedUser.roles.remove(someinfo.rolesId);
        return;
    };

    if (bio.state.toString().toLowerCase().includes(someinfo.input.toString().toLowerCase()) || bio.state.toString().toLowerCase().includes(vanity.toString().toLowerCase())) {
        try {
            return fetchedUser?.roles.add(someinfo.rolesId).catch(() => { });
        } catch (err) { return; };
    };

    if (fetchedUser?.roles.cache.has(someinfo.rolesId)) {
        try {
            fetchedUser?.roles.remove(someinfo.rolesId).catch(() => { });
        } catch (err) { return; };
    };

    return;
};