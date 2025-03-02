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

/*
... (Your copyright and license information)
*/

import { Client, AuditLogEvent, Guild, GuildEditOptions, GuildAuditLogsEntry, PermissionFlagsBits } from 'discord.js';

import { BotEvent } from '../../../types/event.js';

export const event: BotEvent = {
    name: "guildUpdate",
    run: async (client: Client, oldGuild: Guild, newGuild: Guild) => {
        let data = await client.db.get(`${newGuild.id}.PROTECTION`);
        if (!data) return;

        if (!oldGuild.members.me?.permissions.has([
            PermissionFlagsBits.Administrator
        ])) return;

        if (data.updateguild && data.updateguild.mode === 'allowlist') {
            let fetchedLogs = await newGuild.fetchAuditLogs({
                type: AuditLogEvent.GuildUpdate,
                limit: 1,
            });

            let relevantLog = fetchedLogs.entries.find(entry =>
                entry.targetId === newGuild.id &&
                entry.executorId !== client.user?.id &&
                entry.executorId
            );

            if (!relevantLog) {
                return;
            }

            let baseData = await client.db.get(`${newGuild.id}.ALLOWLIST.list.${relevantLog.executorId}`);
            if (baseData) return;

            let member = newGuild.members.cache.get(relevantLog?.executorId!);
            if (!member) return;

            await client.func.method.punish(data, member);

            if (oldGuild.afkChannel !== newGuild.afkChannel) {
                await newGuild.setAFKChannel(oldGuild.afkChannel).catch(() => false);
            }
            if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
                await newGuild.setAFKTimeout(oldGuild.afkTimeout).catch(() => false);
            }
            if (oldGuild.banner !== newGuild.banner) {
                await newGuild.setBanner(oldGuild.banner).catch(() => false);
            }
            if (oldGuild.defaultMessageNotifications !== newGuild.defaultMessageNotifications) {
                await newGuild.setDefaultMessageNotifications(oldGuild.defaultMessageNotifications).catch(() => false);
            }
            if (oldGuild.discoverySplash !== newGuild.discoverySplash) {
                await newGuild.setDiscoverySplash(oldGuild.discoverySplash).catch(() => false);
            }
            if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
                await newGuild.setExplicitContentFilter(oldGuild.explicitContentFilter).catch(() => false);
            }
            if (oldGuild.icon !== newGuild.icon) {
                await newGuild.setIcon(oldGuild.icon).catch(() => false);
            }
            if (oldGuild.mfaLevel !== newGuild.mfaLevel) {
                await newGuild.setMFALevel(oldGuild.mfaLevel).catch(() => false);
            }
            if (oldGuild.name !== newGuild.name) {
                await newGuild.setName(oldGuild.name).catch(() => false);
            }
            if (oldGuild.preferredLocale !== newGuild.preferredLocale) {
                await newGuild.setPreferredLocale(oldGuild.preferredLocale).catch(() => false);
            }
            if (oldGuild.premiumProgressBarEnabled !== newGuild.premiumProgressBarEnabled) {
                await newGuild.setPremiumProgressBarEnabled(oldGuild.premiumProgressBarEnabled).catch(() => false);
            }
        }
    },
};
