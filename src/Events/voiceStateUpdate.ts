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

import { Collection, EmbedBuilder, Permissions, AuditLogEvent, Events, Client, VoiceState, GuildTextBasedChannel, BaseGuildTextChannel, CategoryChannel, ChannelType, PermissionFlagsBits, GuildChannel, VoiceChannel } from 'discord.js';

export default async (client: Client, oldState: VoiceState, newState: VoiceState) => {

    let data = await client.functions.getLanguageData(oldState.guild.id);

    async function serverLogs() {
        if (!oldState || !oldState.guild) return;

        let someinfo = await client.db.get(`${oldState.guild.id}.GUILD.SERVER_LOGS.voice`);
        if (!someinfo) return;

        let Msgchannel = client.channels.cache.get(someinfo);
        if (!Msgchannel) return;

        var Ouser = oldState.id
        var OchannelID = oldState.channelId
        var Ostatus = { selfDeaf: oldState.selfDeaf, selfMute: oldState.selfMute };

        var user = newState.id
        var channelID = newState.channelId
        var status = { selfDeaf: newState.selfDeaf, selfMute: newState.selfMute };

        let targetUser = await client.users.fetch(user);

        if (targetUser.id === client.user?.id) return;

        let iconURL = targetUser.displayAvatarURL();

        let logsEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setAuthor({ name: targetUser.username, iconURL: iconURL })
            .setTimestamp();

        // JOIN/LEAVE
        if (user && !channelID) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${OchannelID}", OchannelID)
            );
            await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
            return;
        };

        if (Ouser && !OchannelID) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_2_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID)
            );
            await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
            return;
        };

        // MUTE CASQUE
        if (!Ostatus.selfDeaf && status.selfDeaf) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_3_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID)
            );
            await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
            return;
        };

        if (Ostatus.selfDeaf && !status.selfDeaf) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_4_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID)
            );
            await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
            return;
        };

        // MUTE MICRO
        if (!Ostatus.selfMute && status.selfMute) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_5_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID)
            );
            await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
            return;
        };

        if (Ostatus.selfMute && !status.selfMute) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_6_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID)
            );
            await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
            return;
        };
    };

    async function voiceInterface() {
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
                let userChannel = newState.guild.channels.cache.get(channelId as string);

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
                                chann.permissionOverwrites.edit(staff_role as string,
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
    };

    serverLogs(), voiceInterface();
};