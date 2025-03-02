/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { Client, AuditLogEvent, GuildBan, PermissionsBitField, InteractionCollector } from 'discord.js'
import { BotEvent } from '../../../types/event.js';

export const event: BotEvent = {
    name: "guildBanRemove",
    run: async (client: Client, ban: GuildBan) => {

        let data = await client.db.get(`${ban.guild.id}.PROTECTION`);
        if (!data) return;

        if (data.unbanmembers && data.unbanmembers.mode === 'allowlist') {

            if (!ban.guild.members.me || !ban.guild.members.me.permissions.has([
                PermissionsBitField.Flags.ViewAuditLog,
                PermissionsBitField.Flags.ManageGuild
            ])) return;

            let fetchedLogs = await ban.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanRemove,
                limit: 75,
            });

            let relevantLog = fetchedLogs.entries.find(entry =>
                entry.targetId === ban.user.id &&
                entry.executorId !== client.user?.id &&
                entry.executorId
            );

            if (!relevantLog) {
                return;
            }

            let baseData = await client.db.get(`${ban.guild.id}.ALLOWLIST.list.${relevantLog.executorId}`);

            if (!baseData) {
                let member = ban.guild.members.cache.get(relevantLog?.executorId!);
                await ban.guild.members.ban(ban.user.id);
                await client.func.method.punish(data, member);
            };
        }
    },
};