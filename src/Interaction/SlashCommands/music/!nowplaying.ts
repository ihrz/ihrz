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
} from 'discord.js';

import { MetadataPlayer } from '../../../../types/metadaPlayer';
import { LanguageData } from '../../../../types/languageData';
import lyricsSearcher from "lyrics-searcher";

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

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

        let player = client.player.getPlayer(interaction.guild?.id as string);
        let voiceChannel = (interaction.member as GuildMember).voice.channel;

        if (!player || !player.playing || !voiceChannel) {
            await interaction.deleteReply();
            await interaction.followUp({ content: data.nowplaying_no_queue, ephemeral: true });
            return;
        };

        let progress = client.functions.generateProgressBar(player.position, player.queue.current?.info.duration)

        let embed = new EmbedBuilder()
            .setTitle(data.nowplaying_message_embed_title)
            .setDescription(`by: ${player.queue.current?.requester}\n**[${player.queue.current?.info.title}](${player.queue.current?.info?.uri})**, ${player.queue.current?.info?.author}`)
            .setThumbnail(`${player.queue.current?.info?.artworkUrl}`)
            .addFields(
                { name: '  ', value: progress?.replace(/ 0:00/g, 'LIVE') as string }
            );

        let response = await interaction.editReply({
            embeds: [embed],
            components: [btn],
        });

        var paused: boolean = false;
        let collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3_600_000 });

        try {

            collector.on('collect', async (i) => {

                if (player || voiceChannel) {

                    if (!player || !player.playing || !voiceChannel) {
                        await i.reply({ content: data.nowplaying_no_queue, ephemeral: true });
                        return;
                    };

                    let channel = client.channels.cache.get(player.textChannelId as string);
                    let requesterId = (player.queue.current?.requester as any).id

                    if (i.user.id === requesterId) {
                        switch (i.customId) {
                            case "pause":
                                i.deferUpdate();
                                if (paused) {
                                    player.resume();
                                    paused = false;
                                    (channel as BaseGuildTextChannel)?.send({ content: `${interaction.user} **resume** the music!` });
                                } else {
                                    player.pause();
                                    paused = true;
                                    (channel as BaseGuildTextChannel)?.send({ content: `${interaction.user} **pause** the music!` });
                                }
                                break;
                            case "lyrics":
                                var lyrics = await lyricsSearcher(
                                    player.queue.current?.info?.title as string,
                                    player.queue.current?.info?.author as string
                                ).catch((err) => {
                                    lyrics = "not found"
                                })

                                if (!lyrics) {
                                    i.reply({ content: 'The lyrics for this song were not found', ephemeral: true });
                                } else {
                                    let trimmedLyrics = lyrics.substring(0, 1997);
                                    let embed = new EmbedBuilder()
                                        .setTitle(player.queue.current?.info?.title as string)
                                        .setURL(player.queue.current?.info?.uri as string)
                                        .setTimestamp()
                                        .setThumbnail(player.queue.current?.info?.artworkUrl as string)
                                        .setAuthor({
                                            name: player.queue.current?.info?.author as string,
                                            iconURL: player.queue.current?.info?.artworkUrl as string,
                                        })
                                        .setDescription(trimmedLyrics.length === 1997 ? `${trimmedLyrics}...` : trimmedLyrics)
                                        .setColor('#cd703a')
                                        .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" });
                                    i.reply({
                                        embeds: [embed],
                                        ephemeral: true,
                                        files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
                                    });
                                };
                                break;
                            case "stop":
                                i.deferUpdate();
                                player.destroy();
                                (channel as BaseGuildTextChannel)?.send({ content: `${interaction.user} **stop** the music!` });
                                break;
                        }

                    } else {
                        await i.reply({ content: ':no_entry_sign:', ephemeral: true });
                    }
                }
            });
        } catch {
            await interaction.channel?.send(client.iHorizon_Emojis.icon.Timer);
            return;
        };
    }
};