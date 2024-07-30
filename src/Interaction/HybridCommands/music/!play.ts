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
    Guild,
    GuildMember,
    GuildVoiceChannelResolvable,
    InteractionEditReplyOptions,
    Message,
    MessagePayload,
    MessageReplyOptions,
    time,
    User,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import maskLink from '../../../core/functions/maskLink.js';
import { SearchPlatform } from 'lavalink-client';
import { SubCommandArgumentValue } from '../../../core/functions/method';

import { QueryType } from 'discord-player';
import logger from '../../../core/logger.js';
import wait from '../../../core/functions/wait.js';

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

        interface Track {
            title: string;
            duration: number | string
            artworkUrl: string | null;
            loadType: string;
            requester: any,
            uri: string;
        }

        interface PlayerInfo {
            guild: Guild
        }

        var yes: Track = { title: "", duration: 0, artworkUrl: "", loadType: "", requester: {}, uri: "" };
        var playerInfo: PlayerInfo = { guild: interaction.guild };

        /**
         * Lavalink Method (Attempt 1)
         */
        try {
            let player = client.lavalink.createPlayer({
                guildId: interaction.guildId as string,
                voiceChannelId: voiceChannel.id,
                textChannelId: interaction.channelId,
            });

            let res = await player.search({ query: check as string, source: source }, interaction.member.user.toString())

            if (res.tracks.length === 0) {
                // let results = new EmbedBuilder()
                //     .setTitle(data.p_embed_title)
                //     .setColor('#ff0000')
                //     .setTimestamp();

                throw new Error("empty pass to discord-player")

                // await client.method.interactionSend(interaction, { embeds: [results] });
                // return;
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
                await player.play()
            };

            var yes: Track = {
                title: res.tracks[0].info.title,
                duration: res.tracks[0].info.duration || 0,
                artworkUrl: res.tracks[0].info.artworkUrl || null,
                requester: player.queue.current?.requester,
                loadType: yes.loadType,
                uri: res.tracks[0].info.uri || ""
            };

            await wait(2500);

            if (!player.playing) {
                player.destroy();
                throw new Error("bug with lavalink, pass to discord-player");
            } else {
                await client.db.table("TEMP").set(`${interaction.guildId}.PLAYER_TYPE`, "lavalink");
            }

        } catch (error) {
            logger.err("Lavalink failed, then try with discord-player");

            /**
             * Discord-Player Method (Attempt 2)
             */
            let result = await interaction.client.player.search(check as string, {
                requestedBy: (interaction.member.user as User), searchEngine: QueryType.AUTO
            });

            let results = new EmbedBuilder()
                .setTitle(data.p_embed_title)
                .setColor('#ff0000')
                .setTimestamp();

            if (!result.hasTracks()) {
                await client.method.interactionEdit(interaction, { embeds: [results] });
                return;
            };

            let req = await interaction.client.player.play((interaction.member as GuildMember).voice.channel?.id as GuildVoiceChannelResolvable, result, {
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel,
                        client: interaction.guild?.members.me,
                        requestedBy: (interaction.member.user as User).globalName || interaction.member.user.username
                    },
                    volume: 60,
                    bufferingTimeout: 3000,
                    leaveOnEnd: true,
                    leaveOnEndCooldown: 150000,
                    leaveOnStop: true,
                    leaveOnStopCooldown: 30000,
                    leaveOnEmpty: true,
                },
            });

            var yes: Track = {
                title: req.track.title,
                duration: req.track.duration,
                artworkUrl: req.track.playlist ? `${req.track.playlist.thumbnail}` : `${req.track.thumbnail}`,
                loadType: (req.track.playlist ? "playlsit" : "track"),
                requester: `<@${req.track.requestedBy?.id}>`,
                uri: req.track.url
            }

            await client.db.table("TEMP").set(`${interaction.guildId}.PLAYER_TYPE`, "player");
        }

        function timeCalculator() {
            let durationStr: string;

            if (typeof yes.duration === "number" && !isNaN(yes.duration)) {
                let totalDurationMs = yes.duration;
                let totalDurationSec = Math.floor(totalDurationMs / 1000);
                let hours = Math.floor(totalDurationSec / 3600);
                let minutes = Math.floor((totalDurationSec % 3600) / 60);
                let seconds = totalDurationSec % 60;
                durationStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else {
                durationStr = String(yes.duration);
            }

            return durationStr;
        };


        let embed = new EmbedBuilder()
            .setDescription(`**${yes.title}**`)
            .setColor('#00cc1a')
            .setTimestamp()
            .setFooter({ text: data.p_duration + `${timeCalculator()}` })
            .setThumbnail(yes.artworkUrl as string);

        const i = await client.method.interactionSend(interaction, {
            content: data.p_loading_message
                .replace("${client.iHorizon_Emojis.icon.Timer}", client.iHorizon_Emojis.icon.Timer)
                .replace("{result}", yes.loadType === "playlist" ? 'playlist' : 'track')
            , embeds: [embed]
        });

        function deleteContent() {
            i.edit({ content: null });
        };

        await client.db.push(`${playerInfo.guild.id}.MUSIC_HISTORY.buffer`,
            `[${(new Date()).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}: PLAYED]: { ${yes.requester} - ${yes.title} | ${yes.uri} } by ${yes.requester}`);
        await client.db.push(`${playerInfo.guild.id}.MUSIC_HISTORY.embed`,
            `${time(new Date(), 'R')}: ${yes.requester} - ${yes.title} | ${yes.uri} by ${yes.requester}`
        );

        setTimeout(deleteContent, 2000);
        return;
    },
};