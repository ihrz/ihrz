/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

import {
	BaseGuildTextChannel,
	CacheType,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	GuildMember,
	Message,
	MessageContextMenuCommandInteraction,
	MessageReplyOptions,
	User,
	time
} from "discord.js";

import { LavalinkNode, Player, SearchResult, Track } from "lavalink-client";

import { LanguageData } from "../../../types/languageData.js";
import maskLink from "./maskLink.js";
import { getTTSData, cleanupTTS } from "../modules/ttsManager.js";

import { Innertube, YTNodes } from "youtubei.js";
import * as spotify from "spotify-metadata";
import appleMusic from "apple-music-metadata";
import amazonMusic from "amazon-music-metadata";
import tidalMusic from "tidal-metadata";

export type PlayInteraction =
	| ChatInputCommandInteraction<"cached">
	| Message
	| MessageContextMenuCommandInteraction<CacheType>;

export type PlayResponsePayload = Pick<
	MessageReplyOptions,
	"allowedMentions" | "content" | "embeds"
>;

const youtube = await Innertube.create();

export interface HandleMusicPlayOptions {
	client: Client;
	deleteAfterMs?: number;
	interaction: PlayInteraction;
	lang: LanguageData;
	queries: string[];
	respond: (payload: PlayResponsePayload) => Promise<Message>;
}

export interface SearchMusicQueryResult {
	node?: LavalinkNode;
	res?: SearchResult;
}

const NO_RESULT_EMBED_COLOR = "#ff0000";
const SUCCESS_EMBED_COLOR = "#00cc1a";
const QUEUE_ADD_EMBED_COLOR = 2829617;
const DEFAULT_VOLUME = 75;

export function buildNoResultEmbed(lang: LanguageData): EmbedBuilder {
	return new EmbedBuilder()
		.setTitle(lang.p_embed_title)
		.setColor(NO_RESULT_EMBED_COLOR)
		.setTimestamp();
}

export function buildTrackDuration(track: Track): string {
	const totalDurationMs = track.info.duration;
	const totalDurationSec = Math.floor(totalDurationMs / 1000);
	const hours = Math.floor(totalDurationSec / 3600);
	const minutes = Math.floor((totalDurationSec % 3600) / 60);
	const seconds = totalDurationSec % 60;

	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function isUrlQuery(query: string): boolean {
	try {
		new URL(query);
		return true;
	} catch {
		return false;
	}
}

export function isSpotifyURL(url: string): boolean {
	try {
		return new URL(url).host.includes("spotify");
	} catch {
		return false;
	}
}

export function isYoutubeURL(url: string): boolean {
	try {
		return new URL(url).host.includes("youtu");
	} catch {
		return false;
	}
}

export function isAppleMusicURL(url: string): boolean {
	try {
		return new URL(url).host.includes("apple.com");
	} catch {
		return false;
	}
}

export function isAmazonMusicURL(url: string): boolean {
	try {
		return new URL(url).host.includes("amazon");
	} catch {
		return false;
	}
}

export function isTidalURL(url: string): boolean {
	try {
		return new URL(url).host.includes("tidal");
	} catch {
		return false;
	}
}

export async function handleSpotify(
	requester: User,
	node: LavalinkNode,
	query: string
): Promise<SearchResult | undefined> {
	const spotifyRes = await spotify.getDetails(query);

	if (!spotifyRes?.tracks?.length) {
		return undefined;
	}

	if (spotifyRes.tracks.length === 1) {
		const track = spotifyRes.tracks[0];

		return await node.search(
			{
				query: `${track.artist} ${track.name}`,
				source: "deezer"
			},
			requester
		);
	}

	// Spotify album / playlist
	const tracks = spotifyRes.tracks.slice(0, 100);

	const results = await Promise.all(
		tracks.map(async (track) => {
			try {
				const res = await node.search(
					{
						query: `${track.artist} ${track.name}`,
						source: "deezer"
					},
					requester
				);

				return res?.tracks?.[0] ?? undefined;
			} catch {
				return undefined;
			}
		})
	);

	const foundTracks = results.filter(
		(track): track is Track => track !== undefined
	);

	if (!foundTracks.length) {
		return undefined;
	}

	return {
		loadType: "playlist",
		tracks: foundTracks,
		playlistInfo: {
			name: "Spotify Playlist",
			title: "Spotify Playlist",
			duration: foundTracks.reduce(
				(total, track) => total + track.info.duration,
				0
			),
			selectedTrack: null
		},
		exception: null,
		pluginInfo: {}
	} as unknown as SearchResult;
}

// I saw that youtube love add extra content in title like (Prod . Ft x x) and deezer/spotify/soundcloud aren't doing it. so i have to sanitized
export function removeParenthesesContent(text: string): string {
	let result = "";
	let depth = 0;

	for (const char of text) {
		if (char === "(" || char === "[") {
			depth++;
		} else if (char === ")" || char === "]") {
			if (depth > 0) depth--;
		} else if (depth === 0) {
			result += char;
		}
	}

	return result.replace(/\s+/g, " ").trim();
}

export function sanitizeYoutubeUrl(input: string): string {
	try {
		const url = new URL(input);

		const youtubeHosts = [
			"youtube.com",
			"www.youtube.com",
			"youtu.be",
			"music.youtube.com"
		];

		if (!youtubeHosts.includes(url.hostname)) {
			return input;
		}

		const removeParams = [
			"si",
			"t",
			"list",
			"index",
			"start_radio",
			"pp",
			"feature",
			"embeds_referring_euri",
			"source_ve_path",
			"app"
		];

		for (const param of removeParams) {
			url.searchParams.delete(param);
		}

		if ([...url.searchParams].length === 0) {
			url.search = "";
		}

		return url.toString();
	} catch {
		return input;
	}
}

export async function handleYoutube(
	requester: User,
	node: LavalinkNode,
	query: string
): Promise<SearchResult | undefined> {
	try {
		const url = sanitizeYoutubeUrl(query);

		const search = await youtube.search(url, {
			type: "video"
		});

		const video = search.videos[0];

		if (!video) {
			return undefined;
		}

		const itemName = removeParenthesesContent(
			(video as YTNodes.Video).title.text || ""
		);
		if (itemName !== "" || itemName !== null) {
			return await node.search(
				{
					query: itemName,
					source: "deezer"
				},
				requester
			);
		} else {
			return undefined;
		}
	} catch (err) {
		logger.err("YouTube handler failed:", err);
		return undefined;
	}
}

export async function handleAppleMusic(
	requester: User,
	node: LavalinkNode,
	query: string
): Promise<SearchResult | undefined> {
	try {
		const res = await appleMusic(query);
		if (!res) {
			return undefined;
		}

		// Single song
		if (res.type === "song") {
			return await node.search(
				{
					query: `${res.title} - ${res.artist.name}`,
					source: "deezer"
				},
				requester
			);
		}

		// Album / Playlist
		if (
			(res.type === "album" || res.type === "playlist") &&
			res.tracks?.length
		) {
			const tracks = res.tracks.slice(0, 100);

			const results = await Promise.all(
				tracks.map(async (track) => {
					try {
						const search = await node.search(
							{
								query: `${track.title} ${track.artist.name}`,
								source: "deezer"
							},
							requester
						);

						return search?.tracks?.[0] ?? undefined;
					} catch {
						return undefined;
					}
				})
			);

			const foundTracks = results.filter(
				(track): track is Track => track !== undefined
			);

			if (!foundTracks.length) {
				return undefined;
			}

			return {
				loadType: "playlist",
				tracks: foundTracks,
				playlistInfo: {
					name: res.title ?? "Apple Music Playlist",
					title: res.title ?? "Apple Music Playlist",
					duration: foundTracks.reduce(
						(total, track) => total + track.info.duration,
						0
					),
					selectedTrack: null
				},
				exception: null,
				pluginInfo: {}
			} as unknown as SearchResult;
		}

		return undefined;
	} catch (err) {
		logger.err("Apple Music handler failed:", err);
		return undefined;
	}
}

export async function handleTidalMusic(
	requester: User,
	node: LavalinkNode,
	query: string
): Promise<SearchResult | undefined> {
	try {
		const res = await tidalMusic(query);
		if (!res) {
			return undefined;
		}

		// Single song
		if (res.type === "song") {
			return await node.search(
				{
					query: `${res.title} - ${res.artist.name}`,
					source: "deezer"
				},
				requester
			);
		}

		// Album / Playlist
		if (
			(res.type === "album" || res.type === "playlist") &&
			res.tracks?.length
		) {
			const tracks = res.tracks.slice(0, 100);

			const results = await Promise.all(
				tracks.map(async (track) => {
					try {
						const search = await node.search(
							{
								query: `${track.title} ${track.artist.name}`,
								source: "deezer"
							},
							requester
						);

						return search?.tracks?.[0] ?? undefined;
					} catch {
						return undefined;
					}
				})
			);

			const foundTracks = results.filter(
				(track): track is Track => track !== undefined
			);

			if (!foundTracks.length) {
				return undefined;
			}

			return {
				loadType: "playlist",
				tracks: foundTracks,
				playlistInfo: {
					name: res.title ?? "Apple Music Playlist",
					title: res.title ?? "Apple Music Playlist",
					duration: foundTracks.reduce(
						(total, track) => total + track.info.duration,
						0
					),
					selectedTrack: null
				},
				exception: null,
				pluginInfo: {}
			} as unknown as SearchResult;
		}

		return undefined;
	} catch (err) {
		logger.err("Apple Music handler failed:", err);
		return undefined;
	}
}

export async function handleAmazonMusic(
	requester: User,
	node: LavalinkNode,
	query: string
): Promise<SearchResult | undefined> {
	try {
		const res = await amazonMusic(query);
		if (!res) {
			return undefined;
		}

		// Single song
		if (res.type === "song") {
			return await node.search(
				{
					query: `${res.title} - ${res.artist.name}`,
					source: "deezer"
				},
				requester
			);
		}

		// Album / Playlist
		if (
			(res.type === "album" || res.type === "playlist") &&
			res.tracks?.length
		) {
			const tracks = res.tracks.slice(0, 100);

			const results = await Promise.all(
				tracks.map(async (track) => {
					try {
						const search = await node.search(
							{
								query: `${track.title} ${track.artist.name}`,
								source: "deezer"
							},
							requester
						);

						return search?.tracks?.[0] ?? undefined;
					} catch {
						return undefined;
					}
				})
			);

			const foundTracks = results.filter(
				(track): track is Track => track !== undefined
			);

			if (!foundTracks.length) {
				return undefined;
			}

			return {
				loadType: "playlist",
				tracks: foundTracks,
				playlistInfo: {
					name: res.title ?? "Apple Music Playlist",
					title: res.title ?? "Apple Music Playlist",
					duration: foundTracks.reduce(
						(total, track) => total + track.info.duration,
						0
					),
					selectedTrack: null
				},
				exception: null,
				pluginInfo: {}
			} as unknown as SearchResult;
		}

		return undefined;
	} catch (err) {
		logger.err("Apple Music handler failed:", err);
		return undefined;
	}
}

export function responseExist(res: SearchResult | undefined): boolean {
	return (res?.tracks.length ?? 0) > 0 && !!res?.tracks?.[0]?.info?.title;
}

export async function searchQueryOnNode(
	client: Client,
	node: LavalinkNode,
	query: string,
	requester: User
): Promise<SearchResult | undefined> {
	// SPOTIFY PART
	if (isSpotifyURL(query)) {
		return await handleSpotify(requester, node, query);
	} else if (isYoutubeURL(query)) {
		return await handleYoutube(requester, node, query);
	} else if (isAppleMusicURL(query)) {
		return await handleAppleMusic(requester, node, query);
	} else if (isAmazonMusicURL(query)) {
		return await handleAmazonMusic(requester, node, query);
	} else if (isTidalURL(query)) {
		return await handleTidalMusic(requester, node, query);
	} else if (isUrlQuery(query)) {
		let res: SearchResult | undefined;

		try {
			res = await node.search({ query, source: "deezer" }, requester);
			logger.debug(
				"Searching URL",
				query,
				"with",
				"deezer",
				"| Result: ",
				res.tracks[0]?.info
			);
		} catch {
			res = undefined;
		}

		if (!res?.tracks[0]) {
			try {
				res = await node.search(
					{ query, source: "soundcloud" },
					requester
				);
				logger.debug(
					"Searching URL",
					query,
					"with",
					"soundcloud",
					"| Result: ",
					res.tracks[0]?.info
				);
			} catch {
				res = undefined;
			}
		}

		return res;
	}

	let res: SearchResult | undefined;

	try {
		res = await node.search({ query, source: "deezer" }, requester);

		if (!responseExist(res)) {
			res = await node.search({ query, source: "soundcloud" }, requester);
			if (!responseExist(res)) res = undefined;
		}
	} catch {
		res = undefined;
	}

	if (
		res?.tracks[0] &&
		!client.func.music_proximity.isSimilar(query, res.tracks[0], 0.5, 0.6)
	) {
		try {
			res = await node.search({ query, source: "soundcloud" }, requester);
			logger.debug(
				"Searching",
				query,
				"with",
				"soundcloud",
				"| Result: ",
				res.tracks[0]?.info
			);
			logger.debug(
				"Soundcloud is 50% similar of the query",
				client.func.music_proximity.isSimilar(
					query,
					res.tracks[0],
					0.5,
					0.6
				)
			);
		} catch {
			res = undefined;
		}
	}

	return res;
}

export async function searchMusicQuery(
	client: Client,
	query: string,
	requester: User,
	preferredNode?: LavalinkNode
): Promise<SearchMusicQueryResult> {
	const nodes = preferredNode
		? [preferredNode]
		: Array.from(client.player.nodeManager.nodes.values()).filter(
				(node) => node.connected !== false
			);

	for (const node of nodes) {
		const res = await searchQueryOnNode(client, node, query, requester);

		if (res?.tracks.length && res.tracks.length > 0) {
			return { node, res };
		}
	}

	return {};
}

export function platformLabel(url: string, lang: LanguageData): string {
	if (url.includes("deezer")) {
		return `\n-# ${client.iHorizon_Emojis.Deezer} [${lang.var_source} Deezer](${url})`;
	} else if (url.includes("soundcloud")) {
		return `\n-# ${client.iHorizon_Emojis.SoundCloud} [${lang.var_source} SoundCloud](${url})`;
	}
	return "";
}

export async function sendQueueAddMessage(
	interaction: PlayInteraction,
	lang: LanguageData,
	player: Player,
	client: Client,
	track: Track
): Promise<void> {
	const channel = interaction.guild?.channels.cache.get(
		player.textChannelId as string
	);

	if (channel?.id !== interaction.channelId) {
		await (channel as BaseGuildTextChannel).send({
			embeds: [
				new EmbedBuilder()
					.setColor(QUEUE_ADD_EMBED_COLOR)
					.setDescription(
						lang.event_mp_audioTrackAdd
							.replace(
								"${client.iHorizon_Emojis.Music_Icon}",
								client.iHorizon_Emojis.Music_Icon
							)
							.replace(
								"${track.title}",
								track.info.title as string
							)
					)
			]
		});
	}
}

export async function handleMusicPlay({
	client,
	deleteAfterMs = 3000,
	interaction,
	lang,
	queries,
	respond
}: HandleMusicPlayOptions): Promise<void> {
	if (
		!client.user ||
		!interaction.member ||
		!interaction.guild ||
		!interaction.channel
	) {
		return;
	}

	const member = interaction.member as GuildMember;
	const voiceChannel = member.voice.channel;

	if (!voiceChannel) {
		await respond({ content: lang.p_not_in_voice_channel });
		return;
	}

	const ttsData = await getTTSData(client, interaction.guild.id);
	if (ttsData && ttsData.enabled) {
		await cleanupTTS(client, interaction.guild.id);
	}

	if (
		interaction.guild.members.me?.voice.channelId &&
		member.voice.channelId !== interaction.guild.members.me.voice.channelId
	) {
		await respond({
			content: lang.music_cannot.replace(
				"${client.iHorizon_Emojis.No}",
				client.iHorizon_Emojis.No
			)
		});
		return;
	}

	const normalizedQueries = queries
		.map((query) => query.trim())
		.filter(Boolean);

	if (normalizedQueries.length === 0) {
		await respond({ embeds: [buildNoResultEmbed(lang)] });
		return;
	}

	if (normalizedQueries.some((query) => !client.func.isAllowedLinks(query))) {
		await respond({ content: lang.p_not_allowed });
		return;
	}

	const requester =
		interaction instanceof Message ? interaction.author : interaction.user;

	let firstResult: SearchResult | undefined;
	let player: Player | undefined;
	let currentNode: LavalinkNode | undefined;

	for (const query of normalizedQueries) {
		const { node, res } = await searchMusicQuery(
			client,
			query,
			requester,
			currentNode
		);

		if (!res || res.tracks.length === 0) {
			await respond({ embeds: [buildNoResultEmbed(lang)] });
			return;
		}

		res.tracks.forEach((track) => {
			track.info.title = maskLink(track.info.title);
		});

		if (!player) {
			currentNode = node;
			player = client.player.createPlayer({
				guildId: interaction.guildId as string,
				node,
				selfDeaf: true,
				selfMute: false,
				textChannelId: interaction.channelId,
				voiceChannelId: voiceChannel.id
			});

			if (player.customVolume) {
				player.setVolume(player.customVolume || DEFAULT_VOLUME);
			}
		}

		if (!player.connected) {
			await player.connect();
		}

		await player.queue.add(
			res.loadType === "playlist" ? res.tracks : res.tracks[0]
		);

		if (!player.playing) {
			await player.play();
		}

		await sendQueueAddMessage(
			interaction,
			lang,
			player,
			client,
			res.tracks[0]
		);

		firstResult ??= res;
	}

	if (!player || !firstResult) {
		return;
	}

	const firstTrack = firstResult.tracks[0];
	const embed = new EmbedBuilder()
		.setDescription(
			`**${firstTrack.info.title}**${platformLabel(firstTrack.info.uri, lang)}`
		)
		.setColor(SUCCESS_EMBED_COLOR)
		.setTimestamp()
		.setFooter({ text: lang.p_duration + buildTrackDuration(firstTrack) })
		.setThumbnail(firstTrack.info.artworkUrl as string);

	const response = await respond({
		content: lang.p_loading_message
			.replace(
				"${client.iHorizon_Emojis.Timer}",
				client.iHorizon_Emojis.Timer
			)
			.replace(
				"{result}",
				firstResult.loadType === "playlist" ? "playlist" : "track"
			),
		embeds: [embed]
	});

	await client.db.push(
		`${player.guildId}.MUSIC_HISTORY.buffer`,
		`[${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}: PLAYED]: { ${firstResult.tracks[0].requester} - ${firstResult.tracks[0].info.title as string} | ${firstResult.tracks[0].info.uri} } by ${firstResult.tracks[0].requester}`
	);
	await client.db.push(
		`${player.guildId}.MUSIC_HISTORY.embed`,
		`${time(new Date(), "R")}: ${player.queue.current?.requester} - ${player.queue.current?.info.title} | ${player.queue.current?.info.uri} by ${player.queue.current?.requester}`
	);

	setTimeout(() => {
		response
			.edit({ content: null, allowedMentions: { repliedUser: false } })
			.catch(() => null);
	}, deleteAfterMs);
}
