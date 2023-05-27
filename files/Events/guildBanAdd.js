const { Collection, EmbedBuilder, Permissions, AuditLogEvent, Events, Client } = require('discord.js');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client, ban) => {
    const fetchedLogs = await ban.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberBanAdd,
        limit: 1,
    });
    
    const firstEntry = fetchedLogs.entries.first();
    async function serverLogs() {
        if (!ban.guild) return;

        const guildId = ban.guild.id;
        const someinfo = await db.get(`${guildId}.GUILD.SERVER_LOGS.moderation`);
        if (!someinfo) return;

        let logsEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setDescription(`<@${firstEntry.executor.id}> **a ban** <@${firstEntry.target.id}>`)
            .setTimestamp();

        await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
    };

    await serverLogs();
};