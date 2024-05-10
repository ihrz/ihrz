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

import { Client, AuditLogEvent, GuildBan, PermissionsBitField } from 'discord.js'
import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "guildBanAdd",
    run: async (client: Client, ban: GuildBan) => {

        let data = await client.db.get(`${ban.guild.id}.PROTECTION`);
        if (!data) return;

        if (data.banmembers && data.banmembers.mode === 'allowlist') {

            if (!ban.guild.members.me || !ban.guild.members.me.permissions.has([
                PermissionsBitField.Flags.ViewAuditLog,
                PermissionsBitField.Flags.ManageGuild
            ])) return;

            let fetchedLogs = await ban.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanAdd,
                limit: 1,
            });

            let firstEntry = fetchedLogs.entries.first();

            if (firstEntry?.targetId !== ban.user.id || firstEntry.executorId === client.user?.id || !firstEntry.executorId) return;

            let baseData = await client.db.get(`${ban.guild.id}.ALLOWLIST.list.${firstEntry.executorId}`);

            if (!baseData) {
                let user = ban.guild.members.cache.get(firstEntry?.executorId);
                await ban.guild.bans.remove(ban.user.id);

                switch (data?.['SANCTION']) {
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