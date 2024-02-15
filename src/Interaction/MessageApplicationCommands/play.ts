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

import {
    ApplicationCommandType,
    BaseGuildTextChannel,
    Client,
    EmbedBuilder,
    GuildMember,
    MessageContextMenuCommandInteraction,
    time,
} from 'discord.js';

import { AnotherCommand } from '../../../types/anotherCommand.js';

export const command: AnotherCommand = {
    name: "Play it in a voice channel",
    type: ApplicationCommandType.Message,
    thinking: true,
    run: async (client: Client, interaction: MessageContextMenuCommandInteraction) => {

        let data = await client.functions.getLanguageData(interaction.guildId);
        let voiceChannel = (interaction.member as GuildMember)?.voice.channel;

        let msg = interaction.options.getMessage("message");
        let check: string = "";

        // if (msg && msg.attachments.size >= 1) {

        //     if (msg.attachments.size == 1) {
        //         let firstAttachement = msg?.attachments.first();
        //         check = firstAttachement?.url as string
        //     } else if (msg.attachments.size > 1) {
        //         msg.attachments.forEach(async content => {

        //             let result = await interaction.client.player.search(content.url, {
        //                 requestedBy: interaction.user, searchEngine: QueryType.AUTO
        //             });

        //             let results = new EmbedBuilder()
        //                 .setTitle(data.p_embed_title)
        //                 .setColor('#ff0000')
        //                 .setTimestamp();

        //             if (!result.hasTracks()) {
        //                 await interaction.editReply({ embeds: [results] });
        //                 return;
        //             };

        //             let yes = await interaction.client.player.play((interaction.member as GuildMember).voice.channel?.id as GuildVoiceChannelResolvable, result, {
        //                 nodeOptions: {
        //                     metadata: {
        //                         channel: interaction.channel,
        //                         client: interaction.guild?.members.me,
        //                         requestedBy: interaction.user.globalName || interaction.user.username
        //                     },
        //                     volume: 60,
        //                     bufferingTimeout: 3000,
        //                     leaveOnEnd: true,
        //                     leaveOnEndCooldown: 150000,
        //                     leaveOnStop: true,
        //                     leaveOnStopCooldown: 30000,
        //                     leaveOnEmpty: true,
        //                 },
        //             });

        //             let embed = new EmbedBuilder()
        //                 .setDescription(`${yes.track.playlist ? `**multiple tracks** from: **${yes.track.playlist.title}**` : `**${yes.track.title}**`}`)
        //                 .setColor('#00cc1a')
        //                 .setTimestamp()
        //                 .setFooter({ text: data.p_duration + `${yes.track.playlist ? `${yess()}` : `${yes.track.duration}`}` });

        //             embed
        //                 .setThumbnail(`${yes.track.playlist ? `${yes.track.playlist.thumbnail}` : `${yes.track.thumbnail}`}`)

        //             await interaction.editReply({
        //                 content: data.p_loading_message
        //                     .replace("{result}", result.playlist ? 'playlist' : 'track')
        //                     .replace("${client.iHorizon_Emojis.icon.Timer}", client.iHorizon_Emojis.icon.Timer)
        //                 , embeds: [embed]
        //             });
        //         });

        //         return;
        //     }

        // } else { check = msg?.content as string };

        if (!voiceChannel) {
            await interaction.editReply({ content: data.p_not_in_voice_channel });
            return;
        };

        if (client.functions.isAllowedLinks(msg?.content)) {
            return interaction.editReply({ content: data.p_not_allowed })
        };

        let player = client.player.createPlayer({
            guildId: interaction.guildId as string,
            voiceChannelId: voiceChannel.id,
            textChannelId: interaction.channelId,
        });

        let res = await player.search({ query: msg?.content as string }, interaction.user)

        if (res.tracks.length === 0) {
            let results = new EmbedBuilder()
                .setTitle(data.p_embed_title)
                .setColor('#ff0000')
                .setTimestamp();

            await interaction.editReply({ embeds: [results] });
            return;
        };

        if (!player.connected) {
            await player.connect();
        };

        await player.queue.add(res.tracks[0]);

        if (!player.playing) {
            await player.play();
        };

        let yes = res.tracks[0];

        function timeCalcultator() {
            let totalDurationMs = yes.info.duration
            let totalDurationSec = Math.floor(totalDurationMs! / 1000);
            let hours = Math.floor(totalDurationSec / 3600);
            let minutes = Math.floor((totalDurationSec % 3600) / 60);
            let seconds = totalDurationSec % 60;
            let durationStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            return durationStr;
        };

        let embed = new EmbedBuilder()
            .setDescription(`**${yes.info.title}**`)
            .setColor('#00cc1a')
            .setTimestamp()
            .setFooter({ text: data.p_duration + `${timeCalcultator()}` })
            .setThumbnail(yes.info.artworkUrl as string);

        await interaction.editReply({
            content: data.p_loading_message
                .replace("${client.iHorizon_Emojis.icon.Timer}", client.iHorizon_Emojis.icon.Timer)
                .replace("{result}", res.playlist ? 'playlist' : 'track')
            , embeds: [embed]
        });

        function deleteContent() {
            interaction.editReply({ content: ' ' });
        };

        await client.db.push(`${player.guildId}.MUSIC_HISTORY.buffer`,
            `[${(new Date()).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}: PLAYED]: { ${player.queue.current?.requester} - ${player.queue.current?.info.title as string} | ${player.queue.current?.info.uri} } by ${player.queue.current?.requester}`);
        await client.db.push(`${player.guildId}.MUSIC_HISTORY.embed`,
            `${time(new Date(), 'R')}: ${player.queue.current?.requester} - ${player.queue.current?.info.title} | ${player.queue.current?.info.uri} by ${player.queue.current?.requester}`
        );

        let channel = client.channels.cache.get(player.textChannelId as string);

        (channel as BaseGuildTextChannel)?.send({
            content: data.event_mp_audioTrackAdd
                .replace("${client.iHorizon_Emojis.icon.Music_Icon}", client.iHorizon_Emojis.icon.Music_Icon)
                .replace("${track.title}", player.queue.current?.info.title as string)
        });
        setTimeout(deleteContent, 4000)
    },
};