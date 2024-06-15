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

import { BaseGuildTextChannel, Client, EmbedBuilder } from 'discord.js';
import { LavalinkManager } from "lavalink-client";

import { LanguageData } from '../../../types/languageData.js';
import logger from '../logger.js';

export default async (client: Client) => {

    let nodes = client.config.lavalink.nodes;

    nodes.forEach(i => {
        i.retryAmount = 100
        i.retryDelay = 5000
    });

    client.player = new LavalinkManager({
        nodes,
        sendToShard(id, payload) {
            return client.guilds.cache.get(id)?.shard?.send(payload);
        },
        playerOptions: {
            onEmptyQueue: {
                destroyAfterMs: 30_000,
            }
        },
        client: {
            id: process.env.CLIENT_ID || client.user?.id!,
            username: "iHorizon"
        },
    });

    client.player.on("trackStart", async (player, track) => {
        let data = await client.functions.getLanguageData(player.guildId) as LanguageData;

        const channel = client.channels.cache.get(player.textChannelId!);

        (channel as BaseGuildTextChannel).send({
            embeds: [
                new EmbedBuilder()
                    .setColor(2829617)
                    .setDescription(data.event_mp_playerStart
                        .replace("${client.iHorizon_Emojis.icon.Music_Icon}", client.iHorizon_Emojis.icon.Music_Icon)
                        .replace("${track.title}", track.info.title)
                        .replace("${queue.channel.name}", `<#${player.voiceChannelId}>`)
                    )
            ]
        });

    });

    client.player.on("queueEnd", async player => {
        let data = await client.functions.getLanguageData(player.guildId) as LanguageData;

        const channel = client.channels.cache.get(player.textChannelId!);

        (channel as BaseGuildTextChannel).send({
            content: data.event_mp_emptyQueue.replace("${client.iHorizon_Emojis.icon.Warning_Icon}", client.iHorizon_Emojis.icon.Warning_Icon)
        });
        return;
    });

    client.player.nodeManager.on("disconnect", (node, reason) => {
        logger.warn(`:: DISCONNECT :: ${node.id} Reason: ${reason.reason} (${reason.code})`);
    }).on("connect", (node) => {
        logger.log(`:: CONNECTED :: ${node.id}`);
    }).on("reconnecting", (node) => {
        logger.warn(`:: RECONNECTING :: ${node.id}`);
    }).on("create", (node) => {
        logger.log(`:: CREATED :: ${node.id}`);
    }).on("destroy", (node) => {
        logger.err(`:: DESTROYED :: ${node.id}`);
    }).on("error", (node, error, payload) => {
        logger.err(`:: ERROR :: ${node.id} ${error}`);
    }).on("resumed", (node, payload, players) => {
        logger.log(`:: RESUMED :: ${node.id} ${players.length}`);
    });
};