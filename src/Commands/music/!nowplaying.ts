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
    EmbedBuilder,
    ActionRowBuilder,
    ComponentType,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';

import {lyricsExtractor} from '@discord-player/extractor';

const lyricsFinder = lyricsExtractor();

export = {
    run: async (client: Client, interaction: any, data: any) => {

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
            return interaction.reply({content: data.nowplaying_no_queue, ephemeral: true});
        }
        ;

        let progress = queue.node.createProgressBar();

        let embed = new EmbedBuilder()
            .setTitle(data.nowplaying_message_embed_title)
            .setDescription(`by: <@${queue.currentTrack.requestedBy.id}>\n**[${queue.currentTrack.title}](${queue.currentTrack.url})**, ${queue.currentTrack.author}`)
            .setThumbnail(`${queue.currentTrack.thumbnail}`)
            .addFields(
                {name: '  ', value: progress.replace(/ 0:00/g, 'LIVE')}
            );

        let response = await interaction.reply({
            embeds: [embed],
            components: [btn],
        });

        var paused: boolean = false;
        try {
            const collector = response.createMessageComponentCollector({componentType: ComponentType.Button, time: 3_600_000});
            collector.on('collect', async (i: { reply: (arg0: { content?: any; ephemeral: boolean; embeds?: EmbedBuilder[]; }) => void; user: { id: any; }; customId: any; deferUpdate: () => void; }) => {
                const queue = interaction.client.player.nodes.get(interaction.guild);

                if (!queue || !queue.isPlaying()) {
                    return i.reply({content: data.nowplaying_no_queue, ephemeral: true});
                }
                ;

                if (i.user.id === queue.currentTrack.requestedBy.id) {
                    switch (i.customId) {
                        case "pause":
                            i.deferUpdate();
                            if (paused) {
                                queue.node.setPaused(false),
                                    paused = false,
                                    queue.metadata.channel.send({content: `${interaction.user} **resume** the music!`});
                            } else {
                                queue.node.setPaused(true),
                                    paused = true,
                                    queue.metadata.channel.send({content: `${interaction.user} **pause** the music!`});
                            }
                            break;
                        case "lyrics":
                            let lyrics = await lyricsFinder.search(queue.currentTrack.title).catch(() => null);
                            if (!lyrics) {
                                i.reply({content: 'The lyrics for this song were not found', ephemeral: true});
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
                                    .setFooter({text: 'iHorizon', iconURL: client.user?.displayAvatarURL()});
                                i.reply({embeds: [embed], ephemeral: true});
                            }
                            ;
                            break;
                        case "stop":
                            i.deferUpdate();
                            client.player.nodes.delete(interaction.guild?.id);
                            queue.metadata.channel.send({content: `${interaction.user} **stop** the music!`});
                            break;
                    }
                } else {
                    await i.reply({content: ':no_entry_sign:', ephemeral: true});
                }
            });

        } catch {
            return await interaction.channel.send('⏲️');
        }
        ;

    },
}