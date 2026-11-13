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
	youtubeListId,
	youtubePlaylist,
	youtubeVideo
} from "../extractors/youtube/index.js";
import {
	shareIdFromUrl,
	sharedPlaylist,
	toLavalinkTrack
} from "../modules/musicLibrary.js";
import type { DatabaseStructure } from "../../../types/database_structure.js";
import { audioAvailable } from "../modules/audioNode.js";
import {
	BaseGuildTextChannel,
	CacheType,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Guild,
	GuildMember,
	Message,
	MessageContextMenuCommandInteraction,
	MessageReplyOptions,
	User,
	escapeMarkdown,
	time
} from "discord.js";

import { LavalinkNode, Player, SearchResult, Track } from "lavalink-client";

import { LanguageData } from "../../../types/languageData.js";
import maskLink from "./maskLink.js";
import { getTTSData, cleanupTTS } from "../modules/ttsManager.js";
import { getH247Data } from "../modules/h247Manager.js";

import * as spotify from "../extractors/spotify/index.js";
import appleMusic from "../extractors/apple-music/index.js";
import amazonMusic from "../extractors/amazon-music/index.js";
import tidalMusic from "../extractors/tidal/index.js";
import { recordPlayedTrack } from "../modules/musicHistory.js";
import { applyGuildApo } from "../modules/musicApo.js";
import {
	NowPlayingPayload,
	openNowPlayingPanel
} from "../modules/nowPlayingPanel.js";
import { secureRandomFloat } from "./random.js";
import { profilTable } from "../../Events/client/ready.js";

export type PlayInteraction =
	| ChatInputCommandInteraction<"cached">
	| Message
	| MessageContextMenuCommandInteraction<CacheType>;

export type PlayResponsePayload = Pick<
	MessageReplyOptions,
	"allowedMentions" | "content" | "embeds"
> &
	Partial<NowPlayingPayload>;

export interface HandleMusicPlayOptions {
	client: Client;
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
const QUEUE_ADD_EMBED_COLOR = 2829617;
const DEFAULT_VOLUME = 75;

export function buildNoResultEmbed(lang: LanguageData): EmbedBuilder {
	return new EmbedBuilder()
		.setTitle(lang.p_embed_title)
		.setColor(NO_RESULT_EMBED_COLOR)
		.setTimestamp();
}

// The track suggestions of /music play and /music lyrics are labelled
// "Title - Artist (2:58)" (musicAutocomplete.ts). Their value is the track
// URL, but a member who edits the picked text sends the label back, and the
// duration makes the search find nothing. Removed here, whole or half typed
// ("(2:58", "(2:"); a closed parenthesis must hold a duration, so a title
// like "Song (2)" or "Song (Live)" is kept.
const CHOICE_DURATION_SUFFIX =
	/\s+\((?:\d{1,2}(?::\d{2}){1,2}\)|\d{1,2}(?::\d{0,2}){0,2})$/;

export function stripChoiceDuration(query: string): string {
	if (isUrlQuery(query)) return query;
	return query.replace(CHOICE_DURATION_SUFFIX, "").trim() || query;
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

// A YouTube link: a playlist (`list=`) gives all its videos, else the video
// alone; each one is then found on Deezer (src/core/extractors/youtube, the
// public pages, no API key).
export async function handleYoutube(
	requester: User,
	node: LavalinkNode,
	query: string
): Promise<SearchResult | undefined> {
	const deezer = async (title: string, artist: string) => {
		try {
			return await node.search(
				{ query: `${title} ${artist}`.trim(), source: "deezer" },
				requester
			);
		} catch {
			return undefined;
		}
	};
	try {
		if (youtubeListId(query)) {
			const playlist = await youtubePlaylist(query).catch((err) => {
				logger.warn(`YouTube playlist not read: ${String(err)}`);
				return null;
			});
			if (playlist?.tracks.length) {
				const found = (
					await mapLimit(
						playlist.tracks.slice(0, 100),
						8,
						async (t) =>
							(await deezer(t.title, t.artist.name))?.tracks?.[0]
					)
				).filter((t): t is Track => !!t);
				if (found.length) {
					return {
						loadType: "playlist",
						tracks: found,
						playlistInfo: {
							name: playlist.title,
							title: playlist.title,
							duration: found.reduce(
								(total, t) => total + t.info.duration,
								0
							),
							selectedTrack: null
						},
						exception: null,
						pluginInfo: {}
					} as unknown as SearchResult;
				}
			}
		}
		const video = await youtubeVideo(query);
		if (!video) return undefined;
		return await deezer(video.title, video.artist.name);
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

/** `fn` over `items`, at most `limit` at a time, results in order. */
export async function mapLimit<T, R>(
	items: T[],
	limit: number,
	fn: (item: T) => Promise<R>
): Promise<R[]> {
	const out: R[] = new Array(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const i = next++;
			out[i] = await fn(items[i]!);
		}
	};
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, worker)
	);
	return out;
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

			// A few at a time: a 100-track playlist in one burst slowed the
			// node down and could outlast the dashboard's wait.
			const results = await mapLimit(tracks, 8, async (track) => {
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
			});

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
					name: res.title ?? "Tidal Playlist",
					title: res.title ?? "Tidal Playlist",
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
		logger.err("Tidal handler failed:", err);
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

export function buildTrackLabel(track: Track): string {
	const title = track.info.title ?? "";
	const author = track.info.author ?? "";
	return `${title} ${author}`.trim();
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
		let deezerRes: SearchResult | undefined;
		try {
			deezerRes = await node.search(
				{ query, source: "deezer" },
				requester
			);
		} catch {
			deezerRes = undefined;
		}

		// Deezer n'a strictement rien -> fallback SoundCloud, comportement inchangé
		if (!responseExist(deezerRes)) {
			let soundcloudRes: SearchResult | undefined;
			try {
				soundcloudRes = await node.search(
					{ query, source: "soundcloud" },
					requester
				);
				logger.debug(
					"Searching",
					query,
					"with",
					"soundcloud",
					"| Result: ",
					soundcloudRes.tracks[0]?.info
				);
			} catch {
				soundcloudRes = undefined;
			}

			return responseExist(soundcloudRes) ? soundcloudRes : undefined;
		}

		if (
			client.func.music_proximity.isSimilar(
				query,
				deezerRes!.tracks[0],
				0.5,
				0.6
			)
		) {
			return deezerRes;
		}

		let soundcloudRes: SearchResult | undefined;
		try {
			soundcloudRes = await node.search(
				{ query, source: "soundcloud" },
				requester
			);
		} catch {
			soundcloudRes = undefined;
		}

		if (!responseExist(soundcloudRes)) {
			return deezerRes;
		}

		const deezerScore = client.func.music_proximity.similarity(
			query,
			buildTrackLabel(deezerRes!.tracks[0])
		);
		const soundcloudScore = client.func.music_proximity.similarity(
			query,
			buildTrackLabel(soundcloudRes!.tracks[0])
		);

		logger.debug(
			"Comparing Deezer vs SoundCloud proximity for",
			query,
			"| Deezer:",
			deezerScore,
			deezerRes!.tracks[0]?.info?.title,
			"| SoundCloud:",
			soundcloudScore,
			soundcloudRes!.tracks[0]?.info?.title
		);

		return soundcloudScore > deezerScore ? soundcloudRes : deezerRes;
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

export async function sendQueueAddMessage(
	interaction: PlayInteraction,
	lang: LanguageData,
	player: Player,
	client: Client,
	track: Track
): Promise<void> {
	if (!interaction.guild) return;
	await announceQueueAdd(
		client,
		lang,
		interaction.guild,
		player,
		track,
		interaction.channelId
	);
}

// The "added to the queue" notice, in the player's text channel unless the
// request came from it (the reply there already says it).
export async function announceQueueAdd(
	client: Client,
	lang: LanguageData,
	guild: Guild,
	player: Player,
	track: Track,
	sourceChannelId: string | null
): Promise<void> {
	const channel = guild.channels.cache.get(player.textChannelId as string);

	if (channel?.id !== sourceChannelId) {
		await (channel as BaseGuildTextChannel).send({
			embeds: [
				new EmbedBuilder()
					.setColor(QUEUE_ADD_EMBED_COLOR)
					.setDescription(
						lang.event_mp_audioTrackAdd
							.replace(
								"${emoji_Music_Icon}",
								client.iHorizon_Emojis.Music_Icon
							)
							.replace(
								"${trackTitle}",
								track.info.title as string
							)
					)
			]
		});
	}
}

// Why a play request was refused, before or while queueing.
export type MusicPlayRefusal =
	| "not_in_voice"
	| "h247_refused"
	| "music_cannot"
	| "no_result"
	| "not_allowed"
	// The audio node is restarting (audioNode.ts).
	| "audio_unavailable";

export interface EnqueueMusicOptions {
	client: Client;
	lang: LanguageData;
	guild: Guild;
	member: GuildMember;
	requester: User;
	queries: string[];
	// Tracks already resolved (a library playlist, the liked tracks): queued
	// as one playlist instead of searching `queries`.
	results?: { name: string; tracks: DatabaseStructure.LibraryTrack[] };
	// Text channel of a player created here.
	textChannelId: string;
	// Where the request came from: no "added" notice is sent there.
	sourceChannelId: string | null;
}

export type EnqueueMusicResult =
	| { ok: true; player: Player; firstResult: SearchResult }
	| { ok: false; reason: MusicPlayRefusal };

// A library list as a search result (no search: the tracks are encoded).
function libraryResult(
	client: Client,
	results: NonNullable<EnqueueMusicOptions["results"]>,
	requester: User
): SearchResult {
	const tracks = results.tracks.map(
		(t) =>
			client.player.utils.buildTrack(
				toLavalinkTrack(t) as never,
				requester
			) as Track
	);
	return {
		loadType: "playlist",
		tracks,
		playlist: {
			name: results.name,
			title: results.name,
			author: null,
			thumbnail: null,
			uri: null,
			selectedTrack: null,
			duration: tracks.reduce((n, t) => n + (t.info.duration || 0), 0)
		},
		exception: null,
		pluginInfo: {}
	} as unknown as SearchResult;
}

// The node of the guild's player, else a node that can play.
function libraryNode(
	client: Client,
	guildId: string
): LavalinkNode | undefined {
	return (
		client.player.getPlayer(guildId)?.node ??
		Array.from(client.player.nodeManager.nodes.values()).find(
			(node) => node.connected !== false && !!node.sessionId
		)
	);
}

// The work of /music play up to the reply: checks, search, queue, playback.
// Shared by the slash command, the context menu and the dashboard.
export async function enqueueMusicQueries({
	client,
	lang,
	guild,
	member,
	requester,
	queries,
	results,
	textChannelId,
	sourceChannelId
}: EnqueueMusicOptions): Promise<EnqueueMusicResult> {
	const voiceChannel = member.voice.channel;

	if (!voiceChannel) return { ok: false, reason: "not_in_voice" };

	const h247Data = await getH247Data(client, guild.id);

	if (
		h247Data?.enabled &&
		member.voice.channelId !== h247Data.voiceChannelId
	) {
		return { ok: false, reason: "h247_refused" };
	}

	const ttsData = await getTTSData(client, guild.id);
	if (ttsData && ttsData.enabled) {
		await cleanupTTS(client, guild.id);
	}

	if (
		guild.members.me?.voice.channelId &&
		member.voice.channelId !== guild.members.me.voice.channelId
	) {
		return { ok: false, reason: "music_cannot" };
	}

	let normalizedQueries = queries
		.map((query) => stripChoiceDuration(query.trim()))
		.filter(Boolean);

	// A playlist shared from iHorizon (music.ihorizon.org/playlist/…): its
	// tracks are kept ready to play, no search and no allowed-site check.
	const only = normalizedQueries.length === 1 ? normalizedQueries[0]! : null;
	const shareId =
		!results && only && isUrlQuery(only) ? shareIdFromUrl(only) : null;
	if (shareId) {
		const shared = await sharedPlaylist(shareId);
		if (!shared?.tracks.length) return { ok: false, reason: "no_result" };
		results = { name: shared.playlist.name, tracks: shared.tracks };
		normalizedQueries = [];
	}

	if (normalizedQueries.length === 0 && !results?.tracks.length) {
		return { ok: false, reason: "no_result" };
	}

	if (normalizedQueries.some((query) => !client.func.isAllowedLinks(query))) {
		return { ok: false, reason: "not_allowed" };
	}

	// Without a node the search finds nothing: say why instead of "no result".
	if (!audioAvailable(client)) {
		return { ok: false, reason: "audio_unavailable" };
	}

	let firstResult: SearchResult | undefined;
	let player: Player | undefined;
	let currentNode: LavalinkNode | undefined;

	const items: Array<string | SearchResult> = results
		? [libraryResult(client, results, requester)]
		: normalizedQueries;
	for (const item of items) {
		const { node, res } =
			typeof item === "string"
				? await searchMusicQuery(client, item, requester, currentNode)
				: {
						node: currentNode ?? libraryNode(client, guild.id),
						res: item
					};

		if (!res || res.tracks.length === 0) {
			return { ok: false, reason: "no_result" };
		}

		res.tracks.forEach((track) => {
			track.info.title = maskLink(track.info.title);
		});

		if (!player) {
			currentNode = node;
			player = client.player.createPlayer({
				guildId: guild.id,
				node,
				selfDeaf: true,
				selfMute: false,
				textChannelId,
				voiceChannelId: voiceChannel.id
			});

			if (player.customVolume) {
				player.setVolume(player.customVolume || DEFAULT_VOLUME);
			}

			// The server-wide APO filter (/music apo), if any. Never throws.
			await applyGuildApo(player);
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

		await announceQueueAdd(
			client,
			lang,
			guild,
			player,
			res.tracks[0],
			sourceChannelId
		);

		firstResult ??= res;
	}

	if (!player || !firstResult) {
		return { ok: false, reason: "no_result" };
	}
	return { ok: true, player, firstResult };
}

// After a successful play: the live now playing panel (sent with `send`)
// and the music history entries.
export async function announceMusicPlay({
	client,
	lang,
	player,
	firstResult,
	requester,
	send
}: {
	client: Client;
	lang: LanguageData;
	player: Player;
	firstResult: SearchResult;
	requester: User;
	send: (payload: NowPlayingPayload) => Promise<Message>;
}): Promise<void> {
	// When the requested track was queued behind another one, the panel
	// shows what plays now plus a note.
	const firstTrack = firstResult.tracks[0];
	const notes: string[] = [];
	const current = player.queue.current;
	const startedNow =
		!!current &&
		(current.encoded && firstTrack.encoded
			? current.encoded === firstTrack.encoded
			: current.info.identifier === firstTrack.info.identifier);
	if (!startedNow) {
		const label =
			firstResult.loadType === "playlist"
				? `${firstResult.playlist?.name || firstTrack.info.title} (${firstResult.tracks.length})`
				: firstTrack.info.title;
		notes.push(
			`-# ${lang.event_mp_audioTrackAdd.replace(
				"${trackTitle}",
				`**${escapeMarkdown(label || "?")}**`
			)}`
		);
	}
	if (
		secureRandomFloat() < 1 / 3 &&
		!(await profilTable.get(`${requester.id}`))
	) {
		notes.push(lang.even_mp_playerStart_tip);
	}

	await openNowPlayingPanel({
		client,
		lang,
		guildId: player.guildId,
		send,
		notes
	});

	await recordMusicPlay(client, player, firstResult);
}

// The music history entries of a play (/music history, dashboard).
export async function recordMusicPlay(
	client: Client,
	player: Player,
	firstResult: SearchResult
): Promise<void> {
	await client.db.push(
		`${player.guildId}.MUSIC_HISTORY.buffer`,
		`[${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}: PLAYED]: { ${firstResult.tracks[0].requester} - ${firstResult.tracks[0].info.title as string} | ${firstResult.tracks[0].info.uri} } by ${firstResult.tracks[0].requester}`
	);
	void recordPlayedTrack(player.guildId, firstResult.tracks[0]);
	await client.db.push(
		`${player.guildId}.MUSIC_HISTORY.embed`,
		`${time(new Date(), "R")}: ${player.queue.current?.requester} - ${player.queue.current?.info.title} | ${player.queue.current?.info.uri} by ${player.queue.current?.requester}`
	);
}

export async function handleMusicPlay({
	client,
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

	const requester =
		interaction instanceof Message ? interaction.author : interaction.user;

	const result = await enqueueMusicQueries({
		client,
		lang,
		guild: interaction.guild,
		member: interaction.member as GuildMember,
		requester,
		queries,
		textChannelId: interaction.channelId,
		sourceChannelId: interaction.channelId
	});

	if (!result.ok) {
		switch (result.reason) {
			case "not_in_voice":
				await respond({ content: lang.p_not_in_voice_channel });
				return;
			case "h247_refused":
				await respond({
					content: lang.h247_play_refused.replace(
						"${emoji_No}",
						client.iHorizon_Emojis.No
					)
				});
				return;
			case "music_cannot":
				await respond({
					content: lang.music_cannot.replace(
						"${emoji_No}",
						client.iHorizon_Emojis.No
					)
				});
				return;
			case "not_allowed":
				await respond({ content: lang.p_not_allowed });
				return;
			case "no_result":
				await respond({ embeds: [buildNoResultEmbed(lang)] });
				return;
			case "audio_unavailable":
				await respond({ content: lang.music_audio_unavailable });
				return;
		}
	}

	// The reply is the live now playing panel.
	await announceMusicPlay({
		client,
		lang,
		player: result.player,
		firstResult: result.firstResult,
		requester,
		send: respond
	});
}
