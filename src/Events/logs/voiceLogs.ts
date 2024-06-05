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

import { EmbedBuilder, Client, VoiceState, BaseGuildTextChannel } from 'discord.js';

import { BotEvent } from '../../../types/event';
import { LanguageData } from '../../../types/languageData';

export const event: BotEvent = {
    name: "voiceStateUpdate",
    run: async (client: Client, oldState: VoiceState, newState: VoiceState) => {

        let data = await client.functions.getLanguageData(oldState.guild.id) as LanguageData;

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
                .replace("${OchannelID}", OchannelID?.toString()!)
            );
            await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
            return;
        };

        if (Ouser && !OchannelID) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_2_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID?.toString()!)
            );
            await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
            return;
        };

        // MUTE CASQUE
        if (!Ostatus.selfDeaf && status.selfDeaf) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_3_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID?.toString()!)
            );
            await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
            return;
        };

        if (Ostatus.selfDeaf && !status.selfDeaf) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_4_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID?.toString()!)
            );
            await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
            return;
        };

        // MUTE MICRO
        if (!Ostatus.selfMute && status.selfMute) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_5_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID?.toString()!)
            );
            await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
            return;
        };

        if (Ostatus.selfMute && !status.selfMute) {
            logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_6_description
                .replace("${targetUser.id}", targetUser.id)
                .replace("${channelID}", channelID?.toString()!)
            );
            await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
            return;
        };
    },
};