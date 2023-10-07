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

import { Channel, Client, Collection, EmbedBuilder, Permissions, AuditLogEvent } from 'discord.js'

export = async (client: Client, role: any) => {

    async function protect() {
        let data = await client.db.get(`${role.guild.id}.PROTECTION`);
        if (!data) return;

        if (data.createrole && data.createrole.mode === 'allowlist') {
            let fetchedLogs = await role.guild.fetchAuditLogs({
                type: AuditLogEvent.RoleCreate,
                limit: 1,
            });
            var firstEntry: any = fetchedLogs.entries.first();
            if (firstEntry.targetId !== role.id) return;
            if (firstEntry.executorId === client.user?.id) return;


            let baseData = await client.db.get(`${role.guild.id}.ALLOWLIST.list.${firstEntry.executorId}`);

            if (!baseData) {
                role.delete({ reason: 'Protect!' });
                let user = await role.guild.members.cache.get(firstEntry.executorId);

                switch (data?.['SANCTION']) {
                    case 'simply':
                        break;
                    case 'simply+derank':
                        user.guild.roles.cache.forEach((element: any) => {
                            if (user.roles.cache.has(element.id) && element.name !== '@everyone') {
                                user.roles.remove(element.id);
                            };
                        });
                        break;
                    case 'simply+ban':
                        user.ban({ reason: 'Protect!' }).catch(() => { });
                        break;
                    default:
                        return;
                };
            };
        }
    };

    protect();
};