const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client, oldPresence, newPresence) => {

    async function supportModule() {
        if (!oldPresence || !oldPresence.guild) return;
        const guildId = oldPresence.guild.id;
        const someinfo = await db.get(`${guildId}.GUILD.SUPPORT`);
        const bio = newPresence.activities[0] || 'null';
        const vanity = oldPresence.guild.vanityURLCode || 'null';
        const fetchedUser = await oldPresence.guild.members.cache.get(oldPresence.user.id);
        if (!someinfo) { return };
        if (!bio.state) { return fetchedUser.roles.remove(someinfo.rolesId) };
        if (bio.state.toString().toLowerCase().includes(someinfo.input.toString().toLowerCase()) || bio.state.toString().toLowerCase().includes(vanity.toString().toLowerCase())) { return fetchedUser.roles.add(someinfo.rolesId) };
        if (fetchedUser.roles.cache.has(someinfo.rolesId)) { fetchedUser.roles.remove(someinfo.rolesId) };
    };

    await supportModule();
};