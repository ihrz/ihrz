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

import { Client, AuditLogEvent, GuildChannel, BaseGuildTextChannel, PermissionFlagsBits } from 'discord.js'

import { BotEvent } from '../../../types/event.js';

export const event: BotEvent = {
    name: "webhooksUpdate",
    run: async (client: Client, channel: GuildChannel) => {

        let data = await client.db.get(`${channel.guild.id}.PROTECTION`);
        if (!data) return;

        if (!channel.guild.members.me?.permissions.has([
            PermissionFlagsBits.Administrator
        ])) return;

        if (data.webhook && data.webhook.mode === 'allowlist') {
            let fetchedLogs = await channel.guild.fetchAuditLogs({
                type: AuditLogEvent.WebhookCreate,
                limit: 1,
            });

            let relevantLog = fetchedLogs.entries.find(entry =>
                entry.target.channelId === channel.id &&
                entry.executorId !== client.user?.id &&
                entry.executorId
            );

            if (!relevantLog) {
                return;
            }

            let baseData = await client.db.get(`${channel.guild.id}.ALLOWLIST.list.${relevantLog.executorId}`);

            if (!baseData) {
                let webhooks = await (channel as BaseGuildTextChannel).fetchWebhooks();
                let myWebhooks = webhooks.filter((webhook) => webhook.id === relevantLog?.target.id);

                for (let [id, webhook] of myWebhooks) await webhook.delete("Protect!");

                let member = channel.guild.members.cache.get(relevantLog.executorId as string);
                await client.method.punish(data, member);
            };
        }
    },
};