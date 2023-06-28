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

const { Collection, EmbedBuilder, PermissionsBitField, AuditLogEvent } = require(`${process.cwd()}/files/ihorizonjs`);

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

        if (!firstEntry) return;
        if (firstEntry.executor.id === client.user.id) return;

        if (!oldMember) return;
        if (!oldMember.guild) return;
        
        const guildId = oldMember.guild.id;

        const someinfo = await DataBaseModel({id: DataBaseModel.Get, key: `${guildId}.GUILD.SERVER_LOGS.roles`});
        if (!someinfo) return;

        let Msgchannel = client.channels.cache.get(someinfo);
        if (!Msgchannel) return;

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
                .replace("${removedRoles}", removedRoles.map(value => `<@&${value}>`))
                .replace("${oldMember.user.username}", oldMember.user.username)
            )
        } else {
            const addedRoles = newMember._roles.filter(roleId => !oldMember._roles.includes(roleId));
            logsEmbed.setDescription(data.event_srvLogs_guildMemberUpdate_2_description
                .replace("${firstEntry.executor.id}", firstEntry.executor.id)
                .replace("${addedRoles}", addedRoles.map(value => `<@&${value}>`))
                .replace("${oldMember.user.username}", oldMember.user.username)
            );
        }

        await Msgchannel.send({ embeds: [logsEmbed] });
    };

    await serverLogs();
};