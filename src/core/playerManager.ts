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

import { Player, Track, GuildQueue } from 'discord-player';
import { SpotifyExtractor, SoundCloudExtractor } from '@discord-player/extractor';
import DeezerExtractor from "discord-player-deezer"

import { Client, time } from 'discord.js';
import logger from './logger';

import { MetadataPlayer } from '../../types/metadaPlayer';
import db from './functions/DatabaseModel';

export = async (client: Client) => {

    let player = new Player(client, {
        ytdlOptions: {
            quality: "highestaudio",
            highWaterMark: 1 << 25
        }
    });

    await player.extractors.register(SpotifyExtractor, {});
    await player.extractors.register(SoundCloudExtractor, {});
    await player.extractors.register(DeezerExtractor, {});

    await player.extractors.loadDefault();

    player.events.on('playerStart', async (queue: GuildQueue, track: Track) => {
        let data = await client.functions.getLanguageData(queue.channel?.guildId);

        (queue.metadata as MetadataPlayer).channel.send({
            content: data.event_mp_playerStart
                .replace("${client.iHorizon_Emojis.icon.Music_Icon}", client.iHorizon_Emojis.icon.Music_Icon)
                .replace("${track.title}", track.title)
                .replace("${queue.channel.name}", queue.channel?.name)
        });
        return;
    });

    player.events.on('audioTrackAdd', async (queue: GuildQueue, track: Track) => {
        let data = await client.functions.getLanguageData(queue.channel?.guildId);

        let buffer = `[${(new Date()).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}: PLAYED]: { ${track.author} - ${track.title} | ${track.url} } by ${(queue.metadata as MetadataPlayer).requestedBy}`
        let embed = `${time((new Date(), data.duration), 'R')}: ${track.author} - ${track.title} | ${track.url} by ${(queue.metadata as MetadataPlayer).requestedBy}`

        await db.push(`${queue.guild.id}.MUSIC_HISTORY.buffer`, buffer);
        await db.push(`${queue.guild.id}.MUSIC_HISTORY.embed`, embed);

        (queue.metadata as MetadataPlayer).channel.send({
            content: data.event_mp_audioTrackAdd
                .replace("${client.iHorizon_Emojis.icon.Music_Icon}", client.iHorizon_Emojis.icon.Music_Icon)
                .replace("${track.title}", track.title)
        });
        return;
    });

    player.events.on('playerError', async (queue: GuildQueue, error: Error) => {
        let data = await client.functions.getLanguageData(queue.channel?.guildId);

        logger.err(data.event_mp_playerError
            .replace("${error.message}", error.message)
        );
        return;
    });

    player.events.on('error', async (queue: GuildQueue, error: Error) => {
        let data = await client.functions.getLanguageData(queue.channel?.guildId);

        logger.err(data.event_mp_error
            .replace("${error.message}", error.message)
        );
        return;
    });

    player.events.on('emptyChannel', async (queue: GuildQueue) => {
        let data = await client.functions.getLanguageData(queue.channel?.guildId);

        player?.nodes.delete(queue);
        (queue.metadata as MetadataPlayer).channel.send({
            content: data.event_mp_emptyChannel.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
        });
        return;
    });

    player.events.on('playerSkip', async (queue: GuildQueue, track: Track) => {
        let data = await client.functions.getLanguageData(queue.channel?.guildId);

        (queue.metadata as MetadataPlayer).channel.send({
            content: data.event_mp_playerSkip
                .replace("${client.iHorizon_Emojis.icon.Music_Icon}", client.iHorizon_Emojis.icon.Music_Icon)
                .replace("${track.title}", track.title)
        });
        return;
    });

    player.events.on('emptyQueue', async (queue: GuildQueue) => {
        let data = await client.functions.getLanguageData(queue.channel?.guildId);

        (queue.metadata as MetadataPlayer).channel.send({
            content: data.event_mp_emptyQueue.replace("${client.iHorizon_Emojis.icon.Warning_Icon}", client.iHorizon_Emojis.icon.Warning_Icon)
        });
        return;
    });

    client.player = player;
};