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

import { Client, AuditLogEvent, Role, GuildMember } from 'pwss'

import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "guildMemberUpdate",
    run: async (client: Client, oldMember: GuildMember, newMember: GuildMember) => {

        let data = await client.db.get(`${newMember.guild.id}.PROTECTION`);
        if (!data) return;

        if (data.updatemember && data.updatemember.mode === 'allowlist') {
            let fetchedLogs = await newMember.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberRoleUpdate,
                limit: 1,
            });
            var firstEntry = fetchedLogs.entries.first();
            if (firstEntry?.targetId !== newMember.id) return;
            if (firstEntry.executorId === client.user?.id) return;


            let baseData = await client.db.get(`${newMember.guild.id}.ALLOWLIST.list.${firstEntry.executorId}`);

            if (!baseData) {
                await newMember.roles.set(oldMember.roles.cache).catch(() => false);

                let user = newMember.guild.members.cache.get(firstEntry?.executorId as string);

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
                };
            };
        }
    },
};