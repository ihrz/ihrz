const { Collection, EmbedBuilder, Permissions, AuditLogEvent, Events, Client } = require('discord.js');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();

const yaml = require('js-yaml');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);

module.exports = async (client, ban) => {
    let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(ban.guild.id)}.yml`, 'utf-8');
    let data = yaml.load(fileContents);

    async function serverLogs() {
        const fetchedLogs = await ban.guild.fetchAuditLogs({
            type: AuditLogEvent.MemberBanAdd,
            limit: 1,
        });
        const firstEntry = fetchedLogs.entries.first();

        const guildId = ban.guild.id;
        const someinfo = await db.get(`${guildId}.GUILD.SERVER_LOGS.moderation`);
        if (!someinfo) return;

        let logsEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setDescription(data.event_srvLogs_banAdd_description
                .replace("${firstEntry.executor.id}", firstEntry.executor.id)
                .replace("${firstEntry.target.id}", firstEntry.target.id)
            )
            .setTimestamp();

        await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
    };

    await serverLogs();
};