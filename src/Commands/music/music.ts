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

import {
    Client,
    Collection,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ActionRowBuilder,
    SelectMenuBuilder,
    ComponentType,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuOptionBuilder,
} from 'discord.js';

import { QueryType, QueueRepeatMode, useQueue } from 'discord-player';
import { lyricsExtractor } from '@discord-player/extractor';

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import config from '../../files/config';

import ms from 'ms';

const lyricsFinder = lyricsExtractor();

export const command: Command = {
    name: "music",
    description: "Subcommand for music category!",
    options: [
        {
            name: 'loop',
            description: 'Set loop mode of the guild!',
            type: 1,
            options: [
                {
                    name: 'mode',
                    type: ApplicationCommandOptionType.Integer,
                    description: 'Loop Type',
                    required: true,
                    choices: [
                        {
                            name: 'Off',
                            value: QueueRepeatMode.OFF
                        },
                        {
                            name: 'On',
                            value: QueueRepeatMode.TRACK
                        }
                    ]
                }
            ],
        },
        {
            name: 'lyrics',
            description: 'Find the lyrics of a title!',
            type: 1,
            options: [
                {
                    name: 'title',
                    type: ApplicationCommandOptionType.String,
                    description: 'The track title you want (you can put URL as you want)',
                    required: true
                }
            ],
        },
        {
            name: 'nowplaying',
            description: 'Get the current playing song!',
            type: 1,
        },
        {
            name: 'pause',
            description: 'Pause the current playing song!',
            type: 1,
        },
        {
            name: 'play',
            description: 'Play a song!',
            type: 1,
            options: [
                {
                    name: 'title',
                    type: ApplicationCommandOptionType.String,
                    description: 'The track title you want (you can put URL as you want)',
                    required: true
                }
            ],
        },
        {
            name: 'queue',
            description: 'Get the queue!',
            type: 1
        },
        {
            name: 'resume',
            description: 'Resume the current playing song!',
            type: 1,
        },
        {
            name: 'shuffle',
            description: 'Shuffle the queue!',
            type: 1,
        },
        {
            name: 'skip',
            description: 'Skip the current playing song!',
            type: 1,
        },
        {
            name: 'stop',
            description: 'Stop the current playing song!',
            type: 1,
        }
    ],
    category: 'music',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let command: any = interaction.options.getSubcommand();

        if (command === 'loop') {

            try {
                const queue = interaction.client.player.nodes.get(interaction.guild);
                if (!queue || !queue.isPlaying()) {
                    return interaction.reply({ content: data.loop_no_queue });
                };

                const loopMode = interaction.options.getNumber("select");

                queue.setRepeatMode(loopMode)
                const mode = loopMode === QueueRepeatMode.TRACK ? `🔂` : loopMode === QueueRepeatMode.QUEUE ? `🔂` : `▶`;
                return interaction.reply({
                    content: data.loop_command_work
                        .replace("{mode}", mode)
                });
            } catch (error: any) {
                logger.err(error);
            };

        } else if (command === 'lyrics') {

            try {
                let title = interaction.options.getString("title");
                let lyrics = await lyricsFinder.search(title).catch(() => null);

                if (!lyrics) return interaction.reply({ content: 'No lyrics found', ephemeral: true });
                let trimmedLyrics = lyrics.lyrics.substring(0, 1997);

                let embed = new EmbedBuilder()
                    .setTitle(lyrics.title)
                    .setURL(lyrics.url)
                    .setTimestamp()
                    .setThumbnail(lyrics.thumbnail)
                    .setAuthor({
                        name: lyrics.artist.name,
                        iconURL: lyrics.artist.image,
                        url: lyrics.artist.url
                    })
                    .setDescription(trimmedLyrics.length === 1997 ? `${trimmedLyrics}...` : trimmedLyrics)
                    .setColor('#cd703a')
                    .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() });

                return interaction.reply({ embeds: [embed] });

            } catch (error: any) {
                logger.err(error);
            };

        } else if (command === 'nowplaying') {

            let pause = new ButtonBuilder()
                .setCustomId('pause')
                .setLabel('⏯')
                .setStyle(ButtonStyle.Success);

            let stop = new ButtonBuilder()
                .setCustomId('stop')
                .setLabel('⏹️')
                .setStyle(ButtonStyle.Primary);

            let lyricsButton = new ButtonBuilder()
                .setCustomId('lyrics')
                .setLabel('📝')
                .setStyle(ButtonStyle.Secondary);

            let btn = new ActionRowBuilder()
                .addComponents(stop, pause, lyricsButton);

            let queue = interaction.client.player.nodes.get(interaction.guild);

            if (!queue || !queue.isPlaying()) {
                return interaction.reply({ content: data.nowplaying_no_queue, ephemeral: true });
            };

            let progress = queue.node.createProgressBar();

            let embed = new EmbedBuilder()
                .setTitle(data.nowplaying_message_embed_title)
                .setDescription(`by: <@${queue.currentTrack.requestedBy.id}>\n**[${queue.currentTrack.title}](${queue.currentTrack.url})**, ${queue.currentTrack.author}`)
                .setThumbnail(`${queue.currentTrack.thumbnail}`)
                .addFields(
                    { name: '  ', value: progress.replace(/ 0:00/g, 'LIVE') }
                );

            let response = await interaction.reply({
                embeds: [embed],
                components: [btn],
            });

            var paused: boolean = false;
            try {
                const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3_600_000 });
                collector.on('collect', async (i: { reply: (arg0: { content?: any; ephemeral: boolean; embeds?: EmbedBuilder[]; }) => void; user: { id: any; }; customId: any; deferUpdate: () => void; }) => {
                    const queue = interaction.client.player.nodes.get(interaction.guild);

                    if (!queue || !queue.isPlaying()) {
                        return i.reply({ content: data.nowplaying_no_queue, ephemeral: true });
                    };

                    if (i.user.id === queue.currentTrack.requestedBy.id) {
                        switch (i.customId) {
                            case "pause":
                                i.deferUpdate();
                                if (paused) {
                                    queue.node.setPaused(false),
                                        paused = false,
                                        queue.metadata.channel.send({ content: `${interaction.user} **resume** the music!` });
                                }
                                else {
                                    queue.node.setPaused(true),
                                        paused = true,
                                        queue.metadata.channel.send({ content: `${interaction.user} **pause** the music!` });
                                }
                                break;
                            case "lyrics":
                                let lyrics = await lyricsFinder.search(queue.currentTrack.title).catch(() => null);
                                if (!lyrics) {
                                    i.reply({ content: 'The lyrics for this song were not found', ephemeral: true });
                                } else {
                                    let trimmedLyrics = lyrics.lyrics.substring(0, 1997);
                                    let embed = new EmbedBuilder()
                                        .setTitle(lyrics.title)
                                        .setURL(lyrics.url)
                                        .setTimestamp()
                                        .setThumbnail(lyrics.thumbnail)
                                        .setAuthor({
                                            name: lyrics.artist.name,
                                            iconURL: lyrics.artist.image,
                                            url: lyrics.artist.url
                                        })
                                        .setDescription(trimmedLyrics.length === 1997 ? `${trimmedLyrics}...` : trimmedLyrics)
                                        .setColor('#cd703a')
                                        .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() });
                                    i.reply({ embeds: [embed], ephemeral: true });
                                };
                                break;
                            case "stop":
                                i.deferUpdate();
                                client.player.nodes.delete(interaction.guild?.id);
                                queue.metadata.channel.send({ content: `${interaction.user} **stop** the music!` });
                                break;
                        }
                    } else {
                        await i.reply({ content: ':no_entry_sign:', ephemeral: true });
                    }
                });

            } catch {
                return await interaction.channel.send('⏲️');
            };

        } else if (command === 'pause') {

            if (!interaction.member.voice.channel) return interaction.reply({ content: data.pause_no_queue });
            try {
                const queue = interaction.client.player.nodes.get(interaction.guild);
                if (!queue || !queue.isPlaying()) {
                    return interaction.reply({ content: data.pause_nothing_playing, ephemeral: true });
                }
                const paused = queue.node.setPaused(true);
                interaction.reply({ content: paused ? 'paused' : "something went wrong" });
                return;
            } catch (error: any) {
                logger.err(error);
            }

        } else if (command === 'play') {

            let voiceChannel = interaction.member.voice.channel;
            let check = interaction.options.getString("title");

            if (!voiceChannel) { return interaction.reply({ content: data.p_not_in_voice_channel }); };
            //if (!client.functions.isLinkAllowed(check)) { return interaction.reply({ content: data.p_not_allowed }) };

            await interaction.deferReply();

            let result = await interaction.client.player.search(check, {
                requestedBy: interaction.user, searchEngine: QueryType.AUTO
            });

            const results = new EmbedBuilder()
                .setTitle(data.p_embed_title)
                .setColor('#ff0000')
                .setTimestamp()

            if (!result.hasTracks()) {
                return await interaction.editReply({ embeds: [results] });
            };

            let yes = await interaction.client.player.play(interaction.member.voice.channel?.id, result, {
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel,
                        client: interaction.guild?.members.me,
                        requestedBy: interaction.user.username
                    },
                    volume: 60,
                    bufferingTimeout: 3000,
                    leaveOnEnd: true,
                },
            });

            function yess() {
                let totalDurationMs = yes.track.playlist.tracks.reduce((a: any, c: { durationMS: any; }) => c.durationMS + a, 0)
                let totalDurationSec = Math.floor(totalDurationMs / 1000);
                let hours = Math.floor(totalDurationSec / 3600);
                let minutes = Math.floor((totalDurationSec % 3600) / 60);
                let seconds = totalDurationSec % 60;
                let durationStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                return durationStr;
            };

            let embed = new EmbedBuilder()
                .setDescription(`${yes.track.playlist ? `**multiple tracks** from: **${yes.track.playlist.title}**` : `**${yes.track.title}**`}`)
                .setColor('#00cc1a')
                .setTimestamp()
                .setFooter({ text: data.p_duration + `${yes.track.playlist ? `${yess()}` : `${yes.track.duration}`}` });

            embed
                .setThumbnail(`${yes.track.playlist ? `${yes.track.playlist.thumbnail}` : `${yes.track.thumbnail}`}`)

            return await interaction.editReply({
                content: data.p_loading_message
                    .replace("{result}", result.playlist ? 'playlist' : 'track'), embeds: [embed]
            });

        } else if (command === 'queue') {

            const queue = useQueue(interaction.guildId);

            if (!queue) return interaction.reply({ content: data.queue_iam_not_voicec })
            if (!queue.tracks || !queue.currentTrack) {
                return interaction.reply({ content: data.queue_no_queue })
            }

            const tracks = queue.tracks
                .toArray()
                .map((track, idx) => `**${++idx})** [${track.title}](${track.url})`)

            if (tracks.length === 0) {
                return interaction.reply({ content: data.queue_empty_queue })
            }

            const embeds: any[] = [];
            const chunkSize = 10;
            let index = 0;
            while (tracks.length > 0) {
                const chunk = tracks.slice(0, chunkSize);
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle(data.queue_embed_title)
                    .setDescription(chunk.join('\n') || data.queue_embed_description_empty)
                    .setFooter({
                        text: data.queue_embed_footer_text
                            .replace("{index}", index + 1)
                            .replace("{track}", queue.tracks.size)
                    });

                embeds.push(embed);
                tracks.splice(0, chunkSize);
                index++;
            }

            const message = await interaction.reply({
                embeds: [embeds[0]],
                fetchReply: true
            })

            if (embeds.length === 1) return

            message.react('⬅️');
            message.react('➡️');

            const collector = message.createReactionCollector({
                filter: (reaction: { emoji: { name: string; }; }, user: { id: any; }) =>
                    ['⬅️', '➡️'].includes(reaction.emoji.name) &&
                    user.id === interaction.user.id,
                time: 60000
            });

            let currentIndex = 0;
            collector.on('collect', (reaction: { emoji: { name: any; }; users: { remove: (arg0: any) => Promise<any>; }; }, user: { id: any; }) => {
                switch (reaction.emoji.name) {
                    case '⬅️':
                        if (currentIndex === 0) return
                        currentIndex--;
                        break;
                    case '➡️':
                        if (currentIndex === embeds.length - 1) return
                        currentIndex++;
                        break;
                    default:
                        break;
                }

                reaction.users.remove(user.id).catch(() => { });

                message.edit({ embeds: [embeds[currentIndex]] });
            })

            collector.on('end', () => {
                message.reactions.removeAll().catch(() => { });
            });

        } else if (command === 'resume') {

            try {
                const queue = interaction.client.player.nodes.get(interaction.guild)

                if (!queue || !queue.isPlaying()) {
                    return interaction.reply({ content: data.resume_nothing_playing });
                }
                queue.node.setPaused(false);
                return interaction.reply({ content: data.resume_command_work });
            } catch (error: any) {
                logger.err(error);
            };

        } else if (command === 'shuffle') {

            let queue = useQueue(interaction.guild.id);
            if (!queue) return interaction.reply({ content: data.shuffle_no_queue });

            if (queue.tracks.size < 2) return interaction.reply({ content: data.shuffle_no_enought });

            await queue.tracks.shuffle();

            return interaction.reply({ content: data.shuffle_command_work });

        } else if (command === 'skip') {

            if (!interaction.member.voice.channel) {
                return interaction.reply({ content: data.skip_not_in_voice_channel });
            }

            try {
                const queue = interaction.client.player.nodes.get(interaction.guild)

                if (!queue || !queue.isPlaying()) {
                    return interaction.reply({ content: data.skip_nothing_playing })
                }

                let currentTrack = queue.current
                let success = queue.node.skip()
                return interaction.reply({
                    content: data.skip_command_work
                        .replace("{queue}", queue.currentTrack)
                })
            } catch (error: any) {
                logger.err(error)
            };

        } else if (command === 'stop') {

            try {
                const queue = interaction.client.player.nodes.get(interaction.guild);

                if (!queue || !queue.isPlaying()) {
                    return interaction.reply({ content: data.stop_nothing_playing, ephemeral: true });
                };

                interaction.client.player.nodes.delete(interaction.guild?.id);
                await interaction.reply({ content: data.stop_command_work });
            } catch (error: any) {
                logger.err(error);
            };

        };
    },
}