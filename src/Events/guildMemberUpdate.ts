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

import { Collection, EmbedBuilder, PermissionsBitField, AuditLogEvent, Client, GuildMember, BaseGuildTextChannel } from 'discord.js';
import * as db from '../core/functions/DatabaseModel';

export = async (client: Client, oldMember: GuildMember, newMember: GuildMember) => {
    let data = await client.functions.getLanguageData(newMember.guild.id);

    async function serverLogs() {
        if (!newMember.guild.members.me?.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;

        let fetchedLogs = await newMember.guild.fetchAuditLogs({
            type: AuditLogEvent.MemberRoleUpdate,
            limit: 1,
        });

        let firstEntry: any = fetchedLogs.entries.first();

        if (!firstEntry
            || firstEntry.executorId == client.user?.id
            || firstEntry.targetId !== newMember.user.id
        ) return;

        let someinfo = await db.DataBaseModel({ id: db.Get, key: `${newMember.guild.id}.GUILD.SERVER_LOGS.roles` });
        let Msgchannel: any = client.channels.cache.get(someinfo);

        if (!someinfo || !Msgchannel) return;

        let newObjects: any[] = [];
        let removeObjects: any[] = [];

        firstEntry.changes.forEach((item: { key: string; new: any; }) => {
            if (item.key === '$add') {
                newObjects.push(...item.new);
            } else if (item.key === '$remove') {
                removeObjects.push(...item.new);
            }
        });

        newObjects = newObjects.map((obj) => obj.id);
        removeObjects = removeObjects.map((obj) => obj.id);

        let logsEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setAuthor({ name: firstEntry.target.username, iconURL: firstEntry.target.displayAvatarURL({ format: 'png', dynamic: true }) })
            .setTimestamp();

        let desc = ' ';

        if (removeObjects.length >= 1) {
            desc += data.event_srvLogs_guildMemberUpdate_description
                .replace("${firstEntry.executor.id}", firstEntry.executor.id)
                .replace("${removedRoles}", removeObjects.map(value => `<@&${value}>`))
                .replace("${oldMember.user.username}", firstEntry.target.username) + '\n';
        };
        if (newObjects.length >= 1) {
            desc += data.event_srvLogs_guildMemberUpdate_2_description
                .replace("${firstEntry.executor.id}", firstEntry.executor.id)
                .replace("${addedRoles}", newObjects.map(value => `<@&${value}>`))
                .replace("${oldMember.user.username}", firstEntry.target.username);
        };
        logsEmbed.setDescription(desc);

        Msgchannel.send({ embeds: [logsEmbed] }).catch(() => { });
    };

    serverLogs();
};