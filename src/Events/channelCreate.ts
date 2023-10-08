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

export = async (client: Client, channel: any) => {

    async function ihrzLogs() {
        if (channel.name !== "ihorizon-logs") return;
        let data = await client.functions.getLanguageData(channel.guild.id);

        let setup_embed = new EmbedBuilder()
            .setColor("#1e1d22")
            .setTitle(data.event_channel_create_message_embed_title)
            .setDescription(data.event_channel_create_message_embed_description);
        await channel.send({ embeds: [setup_embed] }).catch(() => { });
        return;
    };

    async function protect() {
        let data = await client.db.get(`${channel.guild.id}.PROTECTION`);
        if (!data) return;

        if (data.createchannel && data.createchannel.mode === 'allowlist') {
            let fetchedLogs = await channel.guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelCreate,
                limit: 1,
            });
            var firstEntry: any = fetchedLogs.entries.first();
            if (firstEntry.targetId !== channel.id) return;
            if (firstEntry.executorId === client.user?.id) return;

            let baseData = await client.db.get(`${channel.guild.id}.ALLOWLIST.list.${firstEntry.executorId}`);

            if (!baseData) {
                channel.delete();
                let user = await channel.guild.members.cache.get(firstEntry.executorId);

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

    protect(), ihrzLogs();
};