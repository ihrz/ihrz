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

import { Client, VoiceState, CategoryChannel, ChannelType, GuildChannel } from 'discord.js';

import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "voiceStateUpdate",
    run: async (client: Client, oldState: VoiceState, newState: VoiceState) => {

        if (!oldState || !oldState.guild) return;

        // Avoid some troubles
        if (newState.channelId === oldState.channelId) return;

        let table = client.db.table('TEMP');

        let allChannel = await table.get(`CUSTOM_VOICE.${newState.guild.id}`);

        let ChannelForCreate = await client.db.get(`${newState.guild.id}.VOICE_INTERFACE.voice_channel`);
        var ChannelDB = await table.get(`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`);

        let channel_db_fetched = newState.guild.channels.cache.get(ChannelDB) as GuildChannel;
        let result_channel = newState.guild.channels.cache.get(ChannelForCreate);
        let category_channel = newState.guild.channels.cache.get(result_channel?.parentId as string) as CategoryChannel;

        // If the user leave their own empty channel
        if (oldState.channelId === ChannelDB && channel_db_fetched?.members.size === 0) {
            await channel_db_fetched?.delete().catch(() => { });
            await table.delete(`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`);
            return;
        };

        // If the member leave their own channel for trying to create another one
        if (newState.channelId === ChannelForCreate && oldState.channelId === ChannelDB) {
            await newState.member?.voice.disconnect();
            return;
        };

        // If the user leave annother empty channel
        if (oldState.channel?.members.size === 0 && allChannel) {
            let allChannelEntries = Object.entries(allChannel);

            for (let [userId, channelId] of allChannelEntries) {
                if (channelId !== oldState.channelId) continue;
                let userChannel = newState.guild.channels.cache.get(channelId as unknown as string);

                if (oldState.channelId === channelId) {
                    await userChannel?.delete();
                    await table.delete(`CUSTOM_VOICE.${newState.guild.id}.${userId}`);
                    return;
                }
            }
        };

        let staff_role = await client.db.get(`${oldState.guild.id}.VOICE_INTERFACE.staff_role`);

        // If the user join the Create's Channel
        if (newState.channelId === ChannelForCreate && oldState.channelId !== ChannelDB) {

            newState.guild.channels.create({
                name: `${newState.member?.displayName || newState.member?.nickname}'s Channel`,
                parent: result_channel?.parentId,
                permissionOverwrites: category_channel.permissionOverwrites.cache,
                type: ChannelType.GuildVoice,
            }).then(async chann => {
                await table.set(`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`, chann.id);

                newState.member?.voice.setChannel(chann.id)
                    .then(async () => {
                        if ((await chann.fetch()).members.size === 0) {
                            await chann.delete()
                            await table.delete(`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`);
                            return;
                        } else {
                            chann.permissionOverwrites.edit(newState.member?.user.id as string,
                                {
                                    ViewChannel: true,
                                    Connect: true,
                                    Stream: true,
                                    Speak: true,

                                    SendMessages: true,
                                    UseApplicationCommands: true,
                                    AttachFiles: true,
                                    AddReactions: true
                                },
                            );

                            if (staff_role) {
                                chann.permissionOverwrites.edit(staff_role,
                                    {
                                        ViewChannel: true,
                                        Connect: true,
                                        Stream: true,
                                        Speak: true,

                                        SendMessages: true,
                                        UseApplicationCommands: true,
                                        AttachFiles: true,
                                        AddReactions: true,

                                        MuteMembers: true,
                                        DeafenMembers: true,
                                        PrioritySpeaker: true,
                                        KickMembers: true
                                    },
                                );
                            }
                        }
                    })
                    .catch(async () => {
                        await chann.delete().catch(() => { });
                    });
            });
            return;
        };
    },
};