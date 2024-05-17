/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import { Client, AuditLogEvent, GuildChannel, BaseGuildTextChannel } from 'discord.js'

import { BotEvent } from '../../../types/event';
import { LanguageData } from '../../../types/languageData';

export const event: BotEvent = {
    name: "channelDelete",
    run: async (client: Client, channel: GuildChannel) => {

        let data = await client.db.get(`${channel.guild.id}.PROTECTION`);

        if (!data) return;

        if (data.deletechannel && data.deletechannel.mode === 'allowlist') {

            let fetchedLogs = await channel.guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelDelete,
                limit: 1,
            });

            let lang = await client.functions.getLanguageData(channel.guildId) as LanguageData;

            let firstEntry = fetchedLogs.entries.first();

            if (firstEntry?.targetId !== channel.id || firstEntry.executorId === client.user?.id || !firstEntry.executorId) return;

            let baseData = await client.db.get(`${channel.guild.id}.ALLOWLIST.list.${firstEntry.executorId}`);

            if (!baseData) {
                (await channel?.clone({
                    name: channel.name,
                    parent: channel.parent,
                    permissionOverwrites: channel.permissionOverwrites.cache!,
                    topic: (channel as BaseGuildTextChannel).topic!,
                    nsfw: (channel as BaseGuildTextChannel).nsfw,
                    rateLimitPerUser: (channel as BaseGuildTextChannel).rateLimitPerUser!,
                    position: channel.rawPosition,
                    reason: `Channel re-create by Protect (${firstEntry.executorId} break the rule!)`
                }) as BaseGuildTextChannel).send(lang.protection_avoid_channel_delete
                    .replace('${channel.guild.ownerId}', channel.guild.ownerId)
                    .replace('${firstEntry.executorId}', firstEntry.executorId)
                );

                let user = channel.guild.members.cache.get(firstEntry.executorId);

                switch (data?.['SANCTION']) {
                    case 'simply':
                        break;
                    case 'simply+derank':
                        user?.guild.roles.cache.forEach((element) => {
                            if (user?.roles.cache.has(element.id) && element.name !== '@everyone') {
                                user.roles.remove(element.id);
                            }
                        });
                        break;
                    case 'simply+ban':
                        user?.ban({ reason: 'Protect!' }).catch(() => { });
                        break;
                    default:
                        return;
                }
            }
        }

    },
};