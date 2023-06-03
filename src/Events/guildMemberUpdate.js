const { Collection, EmbedBuilder, PermissionsBitField, AuditLogEvent } = require('discord.js');

const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main`);

module.exports = async (client, oldMember, newMember) => {
    let data = await getLanguageData(oldMember.guild.id);

    async function serverLogs() {
        if (!oldMember.guild.members.me.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;

        const fetchedLogs = await oldMember.guild.fetchAuditLogs({
            type: AuditLogEvent.MemberRoleUpdate,
            limit: 1,
        });
        const firstEntry = fetchedLogs.entries.first();

        if (!oldMember) return;
        if (!oldMember.guild) return;
        if (firstEntry.executor.id === client.user.id) return;
        
        const guildId = oldMember.guild.id;

        const someinfo = await DataBaseModel({id: DataBaseModel.Get, key: `${guildId}.GUILD.SERVER_LOGS.roles`});
        if (!someinfo) return;

        let oldRoles = oldMember._roles.length;
        let newRoles = newMember._roles.length;

        let logsEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setAuthor({ name: firstEntry.target.username, iconURL: firstEntry.target.avatarURL({ format: 'png', dynamic: true, size: 512 }) })
            .setTimestamp();

        if (oldRoles > newRoles) {
            const removedRoles = oldMember._roles.filter(roleId => !newMember._roles.includes(roleId));
            logsEmbed.setDescription(data.event_srvLogs_guildMemberUpdate_description
                .replace("${firstEntry.executor.id}", firstEntry.executor.id)
                .replace("${removedRoles}", removedRoles)
                .replace("${oldMember.user.username}", oldMember.user.username)
            )
        } else {
            const addedRoles = newMember._roles.filter(roleId => !oldMember._roles.includes(roleId));
            logsEmbed.setDescription(data.event_srvLogs_guildMemberUpdate_2_description
                .replace("${firstEntry.executor.id}", firstEntry.executor.id)
                .replace("${addedRoles}", addedRoles)
                .replace("${oldMember.user.username}", oldMember.user.username)
            );
        }

        await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
    };

    await serverLogs();
};