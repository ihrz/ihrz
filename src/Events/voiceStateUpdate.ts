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

import { Collection, EmbedBuilder, Permissions, AuditLogEvent, Events, Client, VoiceState, GuildTextBasedChannel, BaseGuildTextChannel, CategoryChannel, ChannelType, PermissionFlagsBits } from 'discord.js';

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

        let table = client.db.table('TEMP');

        let ChannelForCreate = await client.db.get(`${newState.guild.id}.VOICE_INTERFACE.voice_channel`);
        var ChannelDB = await table.get(`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`);

        let channel_db_fetched = newState.guild.channels.cache.get(ChannelDB);
        let result_channel = newState.guild.channels.cache.get(ChannelForCreate);
        let category_channel = newState.guild.channels.cache.get(result_channel?.parentId as string) as CategoryChannel;

        // If the user leave their own empty channel
        if (oldState.channelId === ChannelDB && channel_db_fetched?.members.constructor.length === 0) {
            await channel_db_fetched.delete();
            await table.delete(`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`);
        };

        // If the member leave their own channel for trying to create another one
        if (newState.channelId === ChannelForCreate && oldState.channelId === ChannelDB) {
            await newState.member?.voice.disconnect();
        };

        // If the user join the Create's Channel
        if (newState.channelId === ChannelForCreate && oldState.channelId !== ChannelDB) {

            let channel = await newState.guild.channels.create({
                name: `${newState.member?.displayName || newState.member?.nickname}'s Voice`,
                parent: result_channel?.parentId,
                permissionOverwrites: category_channel.permissionOverwrites.cache,
                type: ChannelType.GuildVoice,
                topic: `${newState.member?.displayName || newState.member?.nickname}'s Voice`
            })

            channel.permissionOverwrites.edit(newState.member?.user.id as string,
                {
                    Connect: true,
                    Stream: true,
                    Speak: true,
                },
            );

            // channel.permissionOverwrites.edit(newState.guild.roles.everyone.id,
            //     {
            //         Connect: false,
            //         Stream: true,
            //         Speak: true,
            //     },
            // );

            await newState.member?.voice.setChannel(channel.id);

            await table.set(`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`, newState.channelId);
            return;
        };
    };

    serverLogs(), voiceInterface();

};