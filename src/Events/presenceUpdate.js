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

const { Client, Intents, Collection, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client, oldPresence, newPresence) => {

    async function supportModule() {
        if (!newPresence.guild.members.me.permissions.has([PermissionsBitField.Flags.ManageRoles])) return;
        if (!oldPresence || !oldPresence.guild) return;

        const guildId = oldPresence.guild.id;
        const someinfo = await db.get(`${guildId}.GUILD.SUPPORT`);
        const bio = newPresence.activities[0] || 'null';

        const vanity = oldPresence.guild.vanityURLCode || 'null';

        const fetchedUser = await oldPresence.guild.members.cache.get(oldPresence.user.id);
        const fetchedRoles = newPresence.guild.roles.cache.get(someinfo.rolesId);

        if (newPresence.guild.members.me.roles.highest.position < fetchedRoles.rawPosition) {
            return;
        };

        if (!someinfo) {
            return;
        };

        if (!bio.state) {
            return fetchedUser.roles.remove(someinfo.rolesId);
        };

        if (bio.state.toString().toLowerCase().includes(someinfo.input.toString().toLowerCase()) || bio.state.toString().toLowerCase().includes(vanity.toString().toLowerCase())) {
            return fetchedUser.roles.add(someinfo.rolesId);
        };

        if (fetchedUser.roles.cache.has(someinfo.rolesId)) {
            fetchedUser.roles.remove(someinfo.rolesId);
        };
    };

    await supportModule();
};