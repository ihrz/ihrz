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

import {
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    InteractionEditReplyOptions,
    Message,
    MessagePayload,
    MessageReplyOptions,
    time,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import maskLink from '../../../core/functions/maskLink.js';
import { SearchPlatform } from 'lavalink-client';
import { SubCommandArgumentValue } from '../../../core/functions/method';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, data: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        let voiceChannel = (interaction.member as GuildMember).voice.channel;

        if (interaction instanceof ChatInputCommandInteraction) {
            var check = interaction.options.getString("title")!;
            var source = interaction.options.getString('source') as SearchPlatform;
        } else {
            var _ = await client.method.checkCommandArgs(interaction, command, args!, data); if (!_) return;
            var source = "ytsearch" as SearchPlatform;
            var check = client.method.longString(args!, 1)!
        }

        if (!voiceChannel) {
            await client.method.interactionSend(interaction, { content: data.p_not_in_voice_channel });
            return;
        };

        if (!client.func.isAllowedLinks(check)) {
            return client.method.interactionSend(interaction, { content: data.p_not_allowed })
        };

        let player = client.player.createPlayer({
            guildId: interaction.guildId as string,
            voiceChannelId: voiceChannel.id,
            textChannelId: interaction.channelId,
        });

        let res = await player.search({ query: check as string, source: source }, interaction.member.user.toString())

        if (res.tracks.length === 0) {
            let results = new EmbedBuilder()
                .setTitle(data.p_embed_title)
                .setColor('#ff0000')
                .setTimestamp();

            await client.method.interactionSend(interaction, { embeds: [results] });
            return;
        };

        res.tracks.forEach(t => {
            t.info.title = maskLink(t.info.title);
        });

        if (!player.connected) {
            await player.connect();
        };

        await player.queue.add(res.loadType === "playlist" ? res.tracks : res.tracks[0]);

        let channel = client.channels.cache.get(player.textChannelId as string);

        (channel as BaseGuildTextChannel).send({
            embeds: [
                new EmbedBuilder()
                    .setColor(2829617)
                    .setDescription(data.event_mp_audioTrackAdd
                        .replace("${client.iHorizon_Emojis.icon.Music_Icon}", client.iHorizon_Emojis.icon.Music_Icon)
                        .replace("${track.title}", res.tracks[0].info.title as string)
                    )
            ]
        });

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

        const i = await client.method.interactionSend(interaction, {
            content: data.p_loading_message
                .replace("${client.iHorizon_Emojis.icon.Timer}", client.iHorizon_Emojis.icon.Timer)
                .replace("{result}", res.loadType === "playlist" ? 'playlist' : 'track')
            , embeds: [embed]
        });

        function deleteContent() {
            i.edit({ content: null });
        };

        await client.db.push(`${player.guildId}.MUSIC_HISTORY.buffer`,
            `[${(new Date()).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}: PLAYED]: { ${res.tracks[0].requester} - ${res.tracks[0].info.title as string} | ${res.tracks[0].info.uri} } by ${res.tracks[0].requester}`);
        await client.db.push(`${player.guildId}.MUSIC_HISTORY.embed`,
            `${time(new Date(), 'R')}: ${player.queue.current?.requester} - ${player.queue.current?.info.title} | ${player.queue.current?.info.uri} by ${player.queue.current?.requester}`
        );

        setTimeout(deleteContent, 3000);
        return;
    },
};