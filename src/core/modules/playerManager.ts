/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { AttachmentBuilder, BaseGuildTextChannel, Client, EmbedBuilder } from 'discord.js';
import { LavalinkManager } from "lavalink-client";

import { LanguageData } from '../../../types/languageData.js';
import logger from '../logger.js';

export default async (client: Client) => {

	let nodes = client.config.lavalink.nodes;

	nodes.forEach(i => {
		i.retryAmount = Infinity
		i.retryDelay = 50_000
	});

	client.player = new LavalinkManager({
		nodes,
		sendToShard(id, payload) {
			return client.guilds.cache.get(id)?.shard?.send(payload);
		},
		playerOptions: {
			onEmptyQueue: {
				destroyAfterMs: 30_000,
			},
			defaultSearchPlatform: "youtube",
			onDisconnect: {
				autoReconnect: false,
				destroyPlayer: true
			}
		},
		client: {
			id: process.env.CLIENT_ID || client.user?.id!,
			username: "iHorizon"
		},
	});

	client.player.on("trackStart", async (player, track) => {
		let data = await client.func.getLanguageData(player.guildId);

		const channel = client.guilds.cache.get(player.guildId)?.channels.cache.get(player.textChannelId!);

		var htmlContent = client.htmlfiles["musicBanner"];

		htmlContent = htmlContent
			.replace("{song_title}", track?.info.title as string)
			.replace("{song_artist}", track?.info.author as string)
			.replace("{song_thumbnail}", track?.info.artworkUrl as string)
			;

		const image = await client.func.html2png(htmlContent, {
			omitBackground: true,
			selectElement: true,
			elementSelector: ".spotify-banner",
		});

		const attachment = new AttachmentBuilder(image, { name: 'music_banner.png' });

		(channel as BaseGuildTextChannel).send({
			embeds: [
				new EmbedBuilder()
					.setColor(2829617)
					.setDescription(data.event_mp_playerStart
						.replace("${client.iHorizon_Emojis.icon.Music_Icon}", client.iHorizon_Emojis.icon.Music_Icon)
						.replace("${track.title}", String(track?.info.title))
						.replace("${queue.channel.name}", `<#${player.voiceChannelId}>`)
						.replace("${url}", track?.info.uri!)
					)
					.setImage('attachment://music_banner.png')
			],
			files: [attachment]
		});

	});

	client.player.on("queueEnd", async player => {
		let data = await client.func.getLanguageData(player.guildId);

		const channel = client.guilds.cache.get(player.guildId)?.channels.cache.get(player.textChannelId!);

		(channel as BaseGuildTextChannel).send({
			content: data.event_mp_emptyQueue.replace("${client.iHorizon_Emojis.icon.Warning_Icon}", client.iHorizon_Emojis.icon.Warning_Icon)
		});
		return;
	});

	client.player.nodeManager.on("disconnect", (node, reason) => {
		// logger.warn(`:: DISCONNECT :: ${node.id} Reason: ${reason.reason} (${reason.code})`);
	}).on("connect", (node) => {
		// logger.log(`:: CONNECTED :: ${node.id}`);
	}).on("reconnecting", (node) => {
		// logger.warn(`:: RECONNECTING :: ${node.id}`);
	}).on("create", (node) => {
		// logger.log(`:: CREATED :: ${node.id}`);
	}).on("destroy", (node) => {
		// logger.err(`:: DESTROYED :: ${node.id}`);
	}).on("error", (node, error, payload) => {
		logger.err(`:: ERROR :: ${node.id} ${error.message}`);
	}).on("resumed", (node, payload, players) => {
		// logger.log(`:: RESUMED :: ${node.id} ${players.length}`);
	});
};