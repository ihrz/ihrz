const { Collection, EmbedBuilder, PermissionsBitField, AuditLogEvent, Events, Client } = require('discord.js');
const getLanguageData = require('../lang/getLanguageData');
const { DataBaseModel } = require(`${process.cwd()}/files/ihorizon-api/main`);

module.exports = async (client, ban) => {
    let data = await getLanguageData(ban.guild.id);
    async function serverLogs() {
        if (!oldMember.guild.members.me.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;

        const fetchedLogs = await ban.guild.fetchAuditLogs({
            type: AuditLogEvent.MemberBanRemove,
            limit: 1,
        });
        const firstEntry = fetchedLogs.entries.first();
        const guildId = ban.guild.id;
        const someinfo = await new DataBaseModel({ id: DataBaseModel.Get, key: `${guildId}.GUILD.SERVER_LOGS.moderation` });

        if (!someinfo.data) return;
        
        let logsEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setDescription(data.event_srvLogs_banRemove_description
                .replace("${firstEntry.executor.id}", firstEntry.executor.id)
                .replace("${firstEntry.target.username}", firstEntry.target.username)
            )
            .setTimestamp();

        await client.channels.cache.get(someinfo.data).send({ embeds: [logsEmbed] }).catch(() => { });
    };
    await serverLogs();
};