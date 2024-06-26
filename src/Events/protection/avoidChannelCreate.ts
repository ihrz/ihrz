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

import { Client, AuditLogEvent, GuildChannel } from 'pwss'
import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "channelCreate",
    run: async (client: Client, channel: GuildChannel) => {

        let data = await client.db.get(`${channel.guild.id}.PROTECTION`);
        if (!data) return;

        if (data.createchannel && data.createchannel.mode === 'allowlist') {

            let fetchedLogs = await channel.guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelCreate,
                limit: 1,
            });

            let firstEntry = fetchedLogs.entries.first();
            if (firstEntry?.targetId !== channel.id || firstEntry.executorId === client.user?.id || !firstEntry.executorId) return;

            let baseData = await client.db.get(`${channel.guild.id}.ALLOWLIST.list.${firstEntry.executorId}`);

            if (!baseData) {
                await channel.delete();
                let user = channel.guild.members.cache.get(firstEntry?.executorId);

                switch (data?.['SANCTION']) {
                    case 'simply':
                        break;
                    case 'simply+derank':
                        await user?.roles.set([], "Punish");
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