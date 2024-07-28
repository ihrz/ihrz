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

import { Client, AuditLogEvent, Role, Channel, GuildChannel, TextChannel, GuildChannelEditOptions, ChannelType, VoiceChannel } from 'discord.js'

import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "channelUpdate",
    run: async (client: Client, oldChannel: GuildChannel, newChannel: GuildChannel) => {

        let data = await client.db.get(`${newChannel.guild.id}.PROTECTION`);
        if (!data) return;

        if (data.updatechannel && data.updatechannel.mode === 'allowlist') {
            let fetchedLogs = await newChannel.guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelUpdate,
                limit: 1,
            });
            var firstEntry = fetchedLogs.entries.first();
            if (firstEntry?.targetId !== newChannel.id) return;
            if (firstEntry.executorId === client.user?.id) return;

            let baseData = await client.db.get(`${newChannel.guild.id}.ALLOWLIST.list.${firstEntry.executorId}`);

            if (!baseData) {
                const editOptions: GuildChannelEditOptions = {
                    name: oldChannel.name,
                    permissionOverwrites: [...oldChannel.permissionOverwrites.cache.values()],
                    parent: oldChannel.parent,
                    position: oldChannel.position
                };

                if (oldChannel.type === ChannelType.GuildText) {
                    editOptions.topic = (oldChannel as TextChannel).topic;
                    editOptions.nsfw = (oldChannel as TextChannel).nsfw;
                    editOptions.rateLimitPerUser = (oldChannel as TextChannel).rateLimitPerUser;
                }

                if (oldChannel.type === ChannelType.GuildVoice) {
                    editOptions.bitrate = (oldChannel as VoiceChannel).bitrate;
                    editOptions.userLimit = (oldChannel as VoiceChannel).userLimit;
                    editOptions.rtcRegion = (oldChannel as VoiceChannel).rtcRegion;
                }

                await newChannel.edit(editOptions);
                let user = newChannel.guild.members.cache.get(firstEntry?.executorId as string);

                switch (data?.['SANCTION']) {
                    case 'simply':
                        break;
                    case 'simply+derank':
                        await user?.roles.set([], "Punish").catch(() => false);
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