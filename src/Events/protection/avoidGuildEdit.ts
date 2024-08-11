/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

/*
... (Your copyright and license information)
*/

import { Client, AuditLogEvent, Guild, GuildEditOptions, GuildAuditLogsEntry } from 'discord.js';

import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "guildUpdate",
    run: async (client: Client, oldGuild: Guild, newGuild: Guild) => {
        let data = await client.db.get(`${newGuild.id}.PROTECTION`);
        if (!data) return;

        if (data.updateguild && data.updateguild.mode === 'allowlist') {
            let fetchedLogs = await newGuild.fetchAuditLogs({
                type: AuditLogEvent.GuildUpdate,
                limit: 75,
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

            await newGuild.setAFKChannel(oldGuild.afkChannel);
            await newGuild.setAFKTimeout(oldGuild.afkTimeout);
            await newGuild.setBanner(oldGuild.banner);
            await newGuild.setDefaultMessageNotifications(oldGuild.defaultMessageNotifications);
            await newGuild.setDiscoverySplash(oldGuild.discoverySplash);
            await newGuild.setExplicitContentFilter(oldGuild.explicitContentFilter);
            await newGuild.setIcon(oldGuild.icon);
            await newGuild.setMFALevel(oldGuild.mfaLevel);
            await newGuild.setName(oldGuild.name);
            await newGuild.setPreferredLocale(oldGuild.preferredLocale);
            await newGuild.setPremiumProgressBarEnabled(oldGuild.premiumProgressBarEnabled);

            let member = newGuild.members.cache.get(relevantLog?.executorId!);
            if (!member) return;

            await client.method.punish(data, member);
        }
    },
};
