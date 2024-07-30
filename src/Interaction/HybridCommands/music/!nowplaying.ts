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
    Client,
    EmbedBuilder,
    ActionRowBuilder,
    ComponentType,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Guild,
    GuildMember,
    BaseGuildTextChannel,
    User,
    Message,
    MessagePayload,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import { SubCommandArgumentValue } from '../../../core/functions/method';
import { lyricsExtractor } from '@discord-player/extractor';
import { MetadataPlayer } from '../../../core/modules/playerManager.js';
let lyricsFinder = lyricsExtractor();

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, data: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (await client.db.table("TEMP").get(`${interaction.guildId}.PLAYER_TYPE`) === "lavalink") {
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

            let btn = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(stop, pause, lyricsButton);

            let player = client.lavalink.getPlayer(interaction.guildId as string);
            let voiceChannel = (interaction.member as GuildMember).voice.channel;

            if (!player || !player.playing || !voiceChannel) {
                await client.method.interactionSend(interaction, { content: data.nowplaying_no_queue });
                return;
            };

            let progress = client.func.generateProgressBar(player.position, player.queue.current?.info.duration)

            let embed = new EmbedBuilder()
                .setTitle(data.nowplaying_message_embed_title)
                .setDescription(`by: ${player.queue.current?.requester}\n**[${player.queue.current?.info.title}](${player.queue.current?.info?.uri})**, ${player.queue.current?.info?.author}`)
                .addFields(
                    { name: '  ', value: progress?.replace(/ 0:00/g, 'LIVE')! }
                );

            if (player.queue.current?.info?.artworkUrl) embed.setThumbnail(player.queue.current?.info?.artworkUrl);

            let response = await client.method.interactionSend(interaction, {
                embeds: [embed],
                components: [btn],
            });

            var paused: boolean = false;
            let collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000 });

            try {

                collector.on('collect', async (i) => {

                    if (player || voiceChannel) {

                        if (!player || !player.playing || !voiceChannel) {
                            await i.reply({ content: data.nowplaying_no_queue, ephemeral: true });
                            return;
                        };

                        let channel = client.channels.cache.get(player.textChannelId as string);
                        let requesterId = (player.queue.current?.requester as User).id

                        if (i.user.id === requesterId) {
                            switch (i.customId) {
                                case "pause":
                                    await i.deferUpdate();
                                    if (paused) {
                                        player.resume();
                                        paused = false;
                                        (channel as BaseGuildTextChannel)?.send({ content: data.nowplaying_resume_button.replace('${interaction.user}', interaction.member?.user.toString()!) });
                                    } else {
                                        player.pause();
                                        paused = true;
                                        (channel as BaseGuildTextChannel)?.send({ content: data.nowplaying_pause_button.replace('${interaction.user}', interaction.member?.user.toString()!) });
                                    }
                                    break;
                                case "lyrics":
                                    await i.deferReply({ ephemeral: true });

                                    var lyrics = await client.lyricsSearcher.search(
                                        player.queue.current?.info?.title as string +
                                        player.queue.current?.info?.author as string
                                    ).catch(() => {
                                        lyrics = null
                                    })

                                    if (!lyrics) {
                                        i.reply({ content: data.nowplaying_lyrics_button, ephemeral: true });
                                    } else {
                                        let trimmedLyrics = lyrics.lyrics.substring(0, 1997);
                                        let embed = new EmbedBuilder()
                                            .setTitle(player.queue.current?.info?.title as string)
                                            .setURL(player.queue.current?.info?.uri as string)
                                            .setTimestamp()
                                            .setThumbnail(lyrics.thumbnail)
                                            .setAuthor({
                                                name: player.queue.current?.info?.author as string,
                                                iconURL: lyrics.artist.image,
                                            })
                                            .setDescription(trimmedLyrics.length === 1997 ? `${trimmedLyrics}...` : trimmedLyrics)
                                            .setColor('#cd703a')
                                            .setFooter(await client.method.bot.footerBuilder(interaction));
                                        i.editReply({
                                            embeds: [embed],
                                            files: [await interaction.client.method.bot.footerAttachmentBuilder(interaction)]
                                        });
                                    };
                                    break;
                                case "stop":
                                    await i.deferUpdate();
                                    player.destroy();
                                    (channel as BaseGuildTextChannel).send({ content: data.nowplaying_stop_buttom.replace('${interaction.user}', interaction.member?.user.toString()!) });
                                    break;
                            }

                        } else {
                            await i.reply({ content: client.iHorizon_Emojis.icon.No_Logo, ephemeral: true });
                        }
                    }
                });

                collector.on('end', async (i) => {
                    btn.components.forEach(x => {
                        x.setDisabled(true)
                    })
                    await response.edit({ components: [] });
                });
            } catch {
                await interaction.channel.send(client.iHorizon_Emojis.icon.Timer);
                return;
            };
        } else {

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

            let btn = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(stop, pause, lyricsButton);

            let queue = interaction.client.player.nodes.get(interaction.guild as Guild);

            if (!queue || !queue.isPlaying()) {
                await client.method.interactionSend(interaction, { content: data.nowplaying_no_queue, ephemeral: true });
                return;
            };

            let progress = queue.node.createProgressBar();

            let embed = new EmbedBuilder()
                .setTitle(data.nowplaying_message_embed_title)
                .setDescription(`by: <@${queue.currentTrack?.requestedBy?.id}>\n**[${queue.currentTrack?.title}](${queue.currentTrack?.url})**, ${queue.currentTrack?.author}`)
                .setThumbnail(`${queue.currentTrack?.thumbnail}`)
                .addFields(
                    { name: '  ', value: progress?.replace(/ 0:00/g, 'LIVE') as string }
                );

            let response = await client.method.interactionSend(interaction, {
                embeds: [embed],
                components: [btn],
            });

            var paused: boolean = false;
            try {
                let collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3_600_000 });
                collector.on('collect', async (i) => {
                    let queue = interaction.client.player.nodes.get(interaction.guild as Guild);

                    if (!queue || !queue.isPlaying()) {
                        await i.reply({ content: data.nowplaying_no_queue, ephemeral: true });
                        return;
                    };

                    if (i.user.id === queue.currentTrack?.requestedBy?.id) {
                        switch (i.customId) {
                            case "pause":
                                i.deferUpdate();
                                if (paused) {
                                    queue.node.setPaused(false);
                                    paused = false;
                                    (queue.metadata as MetadataPlayer).channel?.send({ content: `${interaction.member?.user.toString()} **resume** the music!` });
                                } else {
                                    queue.node.setPaused(true);
                                    paused = true;
                                    (queue.metadata as MetadataPlayer).channel?.send({ content: `${interaction.member?.user.toString()} **pause** the music!` });
                                }
                                break;
                            case "lyrics":
                                let lyrics = await lyricsFinder.search(queue.currentTrack?.title as string).catch(() => null);
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
                                }
                                ;
                                break;
                            case "stop":
                                i.deferUpdate();
                                client.player.nodes.delete(interaction.guildId as unknown as Guild);
                                (queue.metadata as MetadataPlayer).channel?.send({ content: `${interaction.member?.user.toString()} **stop** the music!` });
                                break;
                        }
                    } else {
                        await i.reply({ content: ':no_entry_sign:', ephemeral: true });
                    }
                });

            } catch {
                await interaction.channel?.send(client.iHorizon_Emojis.icon.Timer);
                return;
            };
        }
    }
};