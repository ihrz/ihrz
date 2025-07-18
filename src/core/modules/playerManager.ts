/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { AttachmentBuilder, BaseGuildTextChannel, Client, EmbedBuilder, User } from 'discord.js';
import { LavalinkManager } from "lavalink-client";

import logger from '../logger.js';
import { format } from '../functions/date_and_time.js';

let lavalink_error_channel: 'dont_exist' | null | BaseGuildTextChannel = null;

export default async (client: Client) => {

	const nodes = client.config.lavalink.nodes;

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
			defaultSearchPlatform: 'youtube',
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
		if (lavalink_error_channel === null && client.config.core.lavalinkLogsChannelID) {
			let channel = await client.channels.fetch(client.config.core.lavalinkLogsChannelID).catch(() => null);
			if (channel) {
				lavalink_error_channel = (channel as BaseGuildTextChannel);
			} else {
				lavalink_error_channel = "dont_exist";
			}
		}

		const data = await client.func.getLanguageData(player.guildId);

		const channel = client.guilds.cache.get(player.guildId)?.channels.cache.get(player.textChannelId!);

		let htmlContent = client.htmlfiles["musicBanner"];

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
						.replace("${client.iHorizon_Emojis.Music_Icon}", client.iHorizon_Emojis.Music_Icon)
						.replace("${track.title}", String(track?.info.title))
						.replace("${queue.channel.name}", `<#${player.voiceChannelId}>`)
						.replace("${url}", track?.info.uri!)
					)
					.setImage('attachment://music_banner.png')
			],
			files: [attachment]
		});

	});

	// ts spam the chat lol
	// client.player.on("queueEnd", async player => {
	// 	const data = await client.func.getLanguageData(player.guildId);

	// 	const channel = client.guilds.cache.get(player.guildId)?.channels.cache.get(player.textChannelId!);

	// 	(channel as BaseGuildTextChannel).send({
	// 		content: data.event_mp_emptyQueue.replace("${client.iHorizon_Emojis.Warning_Icon}", client.iHorizon_Emojis.Warning_Icon)
	// 	});
	// 	return;
	// });

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
	})

	client.player.on("trackError", async (player, x, y) => {
		console.log(y.exception?.message)
		let t0 = performance.now();

		if (lavalink_error_channel instanceof BaseGuildTextChannel) {
			let error_log = `
==================================================================================

# Oops! Lavalink issue when lavalink-client "trackError" event.

==================================================================================

# Debug Info

## Client about
Client:
  * WS ping: ${client.ws.ping}ms
  * WS status: ${client.ws.status}

## Guild about
Guild:
  * Guild ID: \`${player.guildId}\`
  * requester User ID: \`${(x?.requester as User).id}\`
  * requester global username: \`${(x?.requester as User).username}\`

## Track about
Track: 
  * Track Info (title, author): \`${y.track.info.title} - ${y.track.info.author}\`
  * Uri: \`${y.track.info.uri}\`
  * Encoded: \`${y.track.encoded}\`
Source: \`${x?.info.sourceName}\`
Stream?: \`${x?.info.isStream ? 'yes' : 'no'}\`

## Error
<TrackExceptionEvent>.error: \`${y.error}\`
<TrackExceptionEvent>.exception.error: \`${JSON.stringify(y.exception?.error || {})}\`

## Node about
Node \`${player.node.id}\`:
  * Connected?: \`${player.node.connected ? 'yes' : 'no'}\`
  * isAlive?: \`${player.node.isAlive ? 'yes' : 'no'}\`
  * HeartBeatPing: \`${player.node.heartBeatPing}\`ms
  * Host: \`${player.node.options.host}:${player.node.options.port}\`
  * SSL?: \`${player.node.options.secure ? 'yes' : 'no'}\`

Report generated in \`${format(new Date(), 'ddd MMM DD HH:MM (YYYY')}\` less that ${performance.now() - t0}ms
`;

			lavalink_error_channel.send({
				content: "<@" + client.config.owner.ownerid1 + ">\nIssue with lavalink founded!",
				files: [
					{
						name: `logs-${Date.now()}.md`,
						attachment: error_log
					}
				]
			})
		}

		if (y.exception?.message === "Something broke when playing the track.") {
			// Search with Soundcloud

			const res = await player.node.search({
				query: `${(y as any).track.info.title} - ${(y as any).track.info.author}`,
				source: "scsearch"
			},
				client.user
			);

			if (res.tracks.length! > 0) {
				await player.queue.add(res.loadType === "playlist" ? res.tracks : res.tracks[0]);

				if (!player.connected) {
					await player.connect();
				}

				if (!player.playing) {
					await player.play();
				}
			}

		} else if (y.exception?.message === "This video requires login.") {
			// Search with Deezer

			const res = await player.node.search({
				query: `${(y as any).track.info.title} - ${(y as any).track.info.author}`,
				source: "deezer"
			},
				client.user
			);

			if (res.tracks.length! > 0) {
				await player.queue.add(res.loadType === "playlist" ? res.tracks : res.tracks[0]);

				if (!player.connected) {
					await player.connect();
				}

				if (!player.playing) {
					await player.play();
				}
			}
		}
	})
};