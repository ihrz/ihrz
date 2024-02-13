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

import { BaseGuildTextChannel, Client } from 'discord.js';
import { Manager } from 'erela.js';

import logger from '../logger.js';

export default async (client: Client) => {

    client.player = new Manager({
        allowedLinksRegexes: Object.values(Manager.regex),
        nodes: [
            {
                identifier: "MyNode1",
                host: "127.0.0.1",
                port: 2333,
                password: "password",
                version: "v4",
                useVersionPath: true,
                secure: false,
            }
        ],
        send: (id, payload) => {
            const guild = client.guilds.cache.get(id);
            if (guild) guild.shard.send(payload);
        },
    });

    client.player.on("nodeConnect", node => {
        logger.log(`Node "${node.options.identifier}" connected.`.gray)
    })

    client.player.on("nodeError", (node, error) => {
        console.log(`Node "${node.options.identifier}" encountered an error: ${error.message}.`)
    })

    client.player.on("trackStart", async (player, track) => {
        let data = await client.functions.getLanguageData(player.guild);

        const channel = client.channels.cache.get(player.textChannel as string);
        (channel as BaseGuildTextChannel).send({
            content: data.event_mp_playerStart
                .replace("${client.iHorizon_Emojis.icon.Music_Icon}", client.iHorizon_Emojis.icon.Music_Icon)
                .replace("${track.title}", track.title)
                .replace("${queue.channel.name}", `<#${player.voiceChannel}>`)
        });
    });

    client.player.on("queueEnd", async player => {
        let data = await client.functions.getLanguageData(player.guild);

        const channel = client.channels.cache.get(player.textChannel as string);
        (channel as BaseGuildTextChannel).send({
            content: data.event_mp_emptyQueue.replace("${client.iHorizon_Emojis.icon.Warning_Icon}", client.iHorizon_Emojis.icon.Warning_Icon)
        });
        return;
    });

    client.player.on('trackError', async (player, err, error) => {
        let data = await client.functions.getLanguageData(player.guild);

        logger.err(data.event_mp_playerError
            .replace("${error.message}", error)
        );
        return;
    });

    // player.events.on('audioTrackAdd', async (queue: GuildQueue, track: Track) => {
    //     let data = await client.functions.getLanguageData(queue.channel?.guildId);

    //     let buffer = `[${(new Date()).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}: PLAYED]: { ${track.author} - ${track.title} | ${track.url} } by ${(queue.metadata as MetadataPlayer).requestedBy}`
    //     let embed = `${time((new Date(), data.duration), 'R')}: ${track.author} - ${track.title} | ${track.url} by ${(queue.metadata as MetadataPlayer).requestedBy}`

    //     await db.push(`${queue.guild.id}.MUSIC_HISTORY.buffer`, buffer);
    //     await db.push(`${queue.guild.id}.MUSIC_HISTORY.embed`, embed);

    //     (queue.metadata as MetadataPlayer).channel.send({
    //         content: data.event_mp_audioTrackAdd
    //             .replace("${client.iHorizon_Emojis.icon.Music_Icon}", client.iHorizon_Emojis.icon.Music_Icon)
    //             .replace("${track.title}", track.title)
    //     });
    //     return;
    // });
    // player.events.on('emptyChannel', async (queue: GuildQueue) => {
    //     let data = await client.functions.getLanguageData(queue.channel?.guildId);

    //     player?.nodes.delete(queue);
    //     (queue.metadata as MetadataPlayer).channel.send({
    //         content: data.event_mp_emptyChannel.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
    //     });
    //     return;
    // });

    // player.events.on('playerSkip', async (queue: GuildQueue, track: Track) => {
    //     let data = await client.functions.getLanguageData(queue.channel?.guildId);

    //     (queue.metadata as MetadataPlayer).channel.send({
    //         content: data.event_mp_playerSkip
    //             .replace("${client.iHorizon_Emojis.icon.Music_Icon}", client.iHorizon_Emojis.icon.Music_Icon)
    //             .replace("${track.title}", track.title)
    //     });
    //     return;
    // });

};