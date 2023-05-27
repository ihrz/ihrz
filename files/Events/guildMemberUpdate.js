const { Collection, EmbedBuilder, Permissions, AuditLogEvent, Events, Client } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client, oldMember, newMember) => {

    const fetchedLogs = await oldMember.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberRoleUpdate,
        limit: 1,
    });

    const firstEntry = fetchedLogs.entries.first();

    async function serverLogs() {
        if (!oldMember) return;
        if (!oldMember.guild) return;

        const guildId = oldMember.guild.id;
        const someinfo = await db.get(`${guildId}.GUILD.SERVER_LOGS.roles`);
        if (!someinfo) return;

        let oldRoles = oldMember._roles.length;
        let newRoles = newMember._roles.length;

        let logsEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setAuthor({ name: firstEntry.target.username, iconURL: firstEntry.target.avatarURL({ format: 'png', dynamic: true, size: 512 }) })
            .setTimestamp();

        if (oldRoles > newRoles) {
            const removedRoles = oldMember._roles.filter(roleId => !newMember._roles.includes(roleId));
            logsEmbed.setDescription(`📤 <@${firstEntry.executor.id}> a supprimé le rôle <@&${removedRoles}> à ${oldMember.user.username}`)

        }
        if (newRoles > oldRoles) {
            const addedRoles = newMember._roles.filter(roleId => !oldMember._roles.includes(roleId));
            logsEmbed.setDescription(`📥 <@${firstEntry.executor.id}> a ajouté le rôle <@&${addedRoles}> à ${oldMember.user.username}`)
        }

        await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
    };

    await serverLogs();
};