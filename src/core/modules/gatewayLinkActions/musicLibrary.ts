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

/**
 * The music library from the dashboard's player: the actor's own playlists
 * and liked tracks (src/core/modules/musicLibrary.ts). Everything runs as the
 * actor, on their library only; the guild is where the player is. Guarded by
 * /music play (who can play music can keep it).
 */

import type { Track } from "lavalink-client";

import type { DatabaseStructure } from "../../../../types/database_structure.js";
import {
	announceMusicPlay,
	enqueueMusicQueries,
	isUrlQuery,
	recordMusicPlay,
	searchMusicQuery
} from "../../functions/musicPlay.js";
import { audioAvailable } from "../audioNode.js";
import logger from "../../logger.js";
import {
	addToPlaylist,
	allFavorites,
	createPlaylist,
	deletePlaylist,
	favoriteKeys,
	favoritesPage,
	findFavorite,
	freeName,
	LibraryError,
	listPlaylists,
	MAX_FAVORITES,
	MAX_PLAYLIST_TRACKS,
	MAX_PLAYLISTS,
	movePlaylistTrack,
	NAME_MAX,
	playlistTracks,
	removeFavorite,
	removeFromPlaylist,
	renamePlaylist,
	setFavorite,
	setShared,
	shareIdFromUrl,
	sharedPlaylist,
	toLibraryTrack,
	trackKey
} from "../musicLibrary.js";
import { AUDIO_UNAVAILABLE, canPostIn, PLAY_ERRORS } from "./music.js";
import { ActionContext, ActionGroup, fail } from "./types.js";

type LibraryTrack = DatabaseStructure.LibraryTrack;

const KEY_MAX = 300;
const PLAYLIST_ID = /^[0-9a-f]{8}$/;

/** What the dashboard shows of a kept track. */
export const libraryTrackView = (t: LibraryTrack) => ({
	key: t.key,
	title: t.title,
	author: t.author,
	uri: t.uri,
	artworkUrl: t.artworkUrl,
	duration: t.duration,
	isStream: t.isStream,
	source: t.sourceName,
	identifier: t.identifier,
	at: t.at
});

// The library's own refusals go back as they are.
async function lib<T>(run: () => Promise<T>): Promise<T> {
	try {
		return await run();
	} catch (error) {
		if (error instanceof LibraryError) return fail(error.message);
		throw error;
	}
}

const playlistId = (ctx: ActionContext, key = "playlist") => {
	const id = ctx.params.str(key, { max: 8 });
	if (!PLAYLIST_ID.test(id)) fail(`invalid parameter: ${key}`);
	return id;
};

/**
 * The track an action is about: `key` (+ `playlist`) for one already kept
 * (a playlist's, else a liked one), `index` for a queued one, else the one
 * playing.
 */
async function targetTrack(ctx: ActionContext): Promise<LibraryTrack> {
	const { client, guild, actor, params } = ctx;
	if (params.has("key")) {
		const key = params.str("key", { max: KEY_MAX });
		if (params.has("from")) {
			const { tracks } = await lib(() =>
				playlistTracks(actor.id, playlistId(ctx, "from"))
			);
			return tracks.find((t) => t.key === key) ?? fail("track not found");
		}
		return (await findFavorite(actor.id, key)) ?? fail("track not found");
	}
	const player = client.player.getPlayer(guild.id);
	let track: Track | null | undefined;
	if (params.has("index")) {
		const index = params.int("index", { min: 0 });
		track = player?.queue.tracks[index] as Track | undefined;
		const identifier = params.optStr("identifier", 500);
		if (!track || (identifier && track.info.identifier !== identifier))
			fail("track not found");
	} else {
		track = player?.queue.current;
		if (!track) fail("nothing is playing");
	}
	return toLibraryTrack(track) ?? fail("this track can't be kept");
}

// Plays a list from the library like /music play does with a playlist.
async function playList(
	ctx: ActionContext,
	name: string,
	tracks: LibraryTrack[]
) {
	const { client, guild, actor, lang } = ctx;
	if (!tracks.length) fail("nothing to play");
	if (ctx.params.bool("shuffle")) {
		tracks = [...tracks];
		for (let i = tracks.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[tracks[i], tracks[j]] = [tracks[j]!, tracks[i]!];
		}
	}
	if (!actor.voice.channel) fail(PLAY_ERRORS.not_in_voice);
	const existing = client.player.getPlayer(guild.id);
	const panelId = existing?.textChannelId ?? actor.voice.channel!.id;
	const panelChannel = guild.channels.cache.get(panelId);
	const canPost = canPostIn(panelChannel, actor);
	const result = await enqueueMusicQueries({
		client,
		lang,
		guild,
		member: actor,
		requester: actor.user,
		queries: [],
		results: { name, tracks: tracks.slice(0, MAX_PLAYLIST_TRACKS) },
		textChannelId: panelId,
		sourceChannelId: canPost ? panelId : null
	});
	if (!result.ok) return fail(PLAY_ERRORS[result.reason]);
	const after =
		canPost && panelChannel && !existing?.queue.current
			? announceMusicPlay({
					client,
					lang,
					player: result.player,
					firstResult: result.firstResult,
					requester: actor.user,
					send: (payload) => (panelChannel as any).send(payload)
				})
			: recordMusicPlay(client, result.player, result.firstResult);
	after.catch((error) => logger.err(error));
	return { queued: result.firstResult.tracks.length };
}

const LIMITS = {
	playlists: MAX_PLAYLISTS,
	playlistTracks: MAX_PLAYLIST_TRACKS,
	favorites: MAX_FAVORITES,
	name: NAME_MAX
};

export const musicLibraryActions: ActionGroup = {
	// The actor's playlists, their liked tracks count and the limits.
	"music.library": {
		read: true,
		command: "music play",
		run: async ({ actor }) => ({
			playlists: await listPlaylists(actor.id),
			favorites: (await favoriteKeys(actor.id)).size,
			limits: LIMITS
		})
	},

	// Whether tracks are liked: `keys` (comma separated, up to 100).
	"music.liked": {
		read: true,
		command: "music play",
		run: async ({ actor, params }) => {
			const raw = params.str("keys", { max: 100 * (KEY_MAX + 1) });
			const keys = raw.split(",").filter(Boolean).slice(0, 100);
			const liked = await favoriteKeys(actor.id);
			return { liked: keys.filter((k) => liked.has(k)) };
		}
	},

	"music.playlist": {
		read: true,
		command: "music play",
		run: async (ctx) => {
			const { playlist, tracks } = await lib(() =>
				playlistTracks(ctx.actor.id, playlistId(ctx))
			);
			const liked = await favoriteKeys(ctx.actor.id);
			return {
				playlist,
				tracks: tracks.map((t) => ({
					...libraryTrackView(t),
					liked: liked.has(t.key)
				}))
			};
		}
	},

	"music.favorites": {
		read: true,
		command: "music play",
		run: async ({ actor, params }) => {
			const offset = params.int("offset", { min: 0, def: 0 });
			const limit = params.int("limit", { min: 1, max: 100, def: 50 });
			const { count, tracks } = await favoritesPage(
				actor.id,
				offset,
				limit
			);
			return { count, tracks: tracks.map(libraryTrackView) };
		}
	},

	// Likes or unlikes a track (see targetTrack). `liked`: the state wanted.
	"music.like": {
		command: "music play",
		run: async (ctx) => {
			const liked = ctx.params.bool("liked", true);
			if (!liked && ctx.params.has("key") && !ctx.params.has("from")) {
				const key = ctx.params.str("key", { max: KEY_MAX });
				await lib(() => removeFavorite(ctx.actor.id, key));
				return { key, liked: false };
			}
			const track = await targetTrack(ctx);
			const now = await lib(() =>
				setFavorite(ctx.actor.id, track, liked)
			);
			return { key: track.key, liked: now };
		}
	},

	// A new playlist; `with`: "current" (the track playing) or "queue" (it
	// and the queue) to start it with.
	"music.playlist-create": {
		command: "music play",
		run: async (ctx) => {
			const { client, guild, actor, params } = ctx;
			const name = params.str("name", { max: 200 });
			const start = params.oneOf(
				"with",
				["none", "current", "queue"],
				"none"
			);
			const player = client.player.getPlayer(guild.id);
			const first =
				start === "none" || !player
					? []
					: [
							player.queue.current,
							...(start === "queue" ? player.queue.tracks : [])
						]
							.map((t) => toLibraryTrack(t as Track))
							.filter((t): t is LibraryTrack => !!t);
			const playlist = await lib(() =>
				createPlaylist(actor.id, name, first)
			);
			return { playlist };
		}
	},

	"music.playlist-rename": {
		command: "music play",
		run: async (ctx) => {
			const id = playlistId(ctx);
			const name = ctx.params.str("name", { max: 200 });
			return {
				playlist: await lib(() =>
					renamePlaylist(ctx.actor.id, id, name)
				)
			};
		}
	},

	"music.playlist-delete": {
		command: "music play",
		run: async (ctx) => {
			const id = playlistId(ctx);
			await lib(() => deletePlaylist(ctx.actor.id, id));
			return { deleted: id };
		}
	},

	// Adds a track (see targetTrack) or, with `all`, the playing track and
	// the whole queue.
	"music.playlist-add": {
		command: "music play",
		run: async (ctx) => {
			const id = playlistId(ctx);
			let tracks: LibraryTrack[];
			if (ctx.params.bool("all")) {
				const player = ctx.client.player.getPlayer(ctx.guild.id);
				if (!player?.queue.current) fail("nothing is playing");
				tracks = [player!.queue.current, ...player!.queue.tracks]
					.map((t) => toLibraryTrack(t as Track))
					.filter((t): t is LibraryTrack => !!t);
			} else {
				tracks = [await targetTrack(ctx)];
			}
			const { playlist, result } = await lib(() =>
				addToPlaylist(ctx.actor.id, id, tracks)
			);
			return { playlist, ...result };
		}
	},

	"music.playlist-remove": {
		command: "music play",
		run: async (ctx) => {
			const id = playlistId(ctx);
			const key = ctx.params.str("key", { max: KEY_MAX });
			const { playlist } = await lib(() =>
				removeFromPlaylist(ctx.actor.id, id, key)
			);
			return { playlist };
		}
	},

	"music.playlist-move": {
		command: "music play",
		run: async (ctx) => {
			const id = playlistId(ctx);
			const from = ctx.params.int("from", {
				min: 0,
				max: MAX_PLAYLIST_TRACKS
			});
			const to = ctx.params.int("to", {
				min: 0,
				max: MAX_PLAYLIST_TRACKS
			});
			const { playlist } = await lib(() =>
				movePlaylistTrack(ctx.actor.id, id, from, to)
			);
			return { playlist };
		}
	},

	// A new playlist from a link: a TIDAL, Spotify, Apple Music, Deezer,
	// YouTube or SoundCloud playlist or album (resolved by the music node,
	// like /music play), or someone's public iHorizon playlist. `name` is
	// optional (the source's name otherwise, made unique).
	"music.playlist-import": {
		command: "music play",
		run: async (ctx) => {
			const { client, actor, params } = ctx;
			const url = params.str("url", { max: 500 }).trim();
			const wanted = params.optStr("name", 200)?.trim() || null;
			if (!isUrlQuery(url)) fail("a playlist link is needed");
			const musicSite = client.func.isAllowedLinks(url);
			const shareId = shareIdFromUrl(url, musicSite);
			let name: string;
			let tracks: LibraryTrack[];
			if (shareId) {
				const shared = await sharedPlaylist(shareId);
				if (!shared) fail("playlist not found");
				name = wanted ?? shared!.playlist.name;
				tracks = shared!.tracks;
			} else {
				if (!musicSite) fail("this link is not allowed");
				if (!audioAvailable(client)) fail(AUDIO_UNAVAILABLE);
				const { res } = await searchMusicQuery(client, url, actor.user);
				if (!res?.tracks.length) fail("nothing found at this link");
				tracks = res!.tracks
					.map((t) => toLibraryTrack(t as Track))
					.filter((t): t is LibraryTrack => !!t);
				name =
					wanted ??
					(res!.playlist?.name ||
						(res!.tracks.length === 1
							? res!.tracks[0]!.info.title
							: "Imported playlist"));
			}
			if (!tracks.length) fail("nothing found at this link");
			const unique = await freeName(actor.id, name);
			const playlist = await lib(() =>
				createPlaylist(actor.id, unique, tracks)
			);
			return { playlist, found: tracks.length, kept: playlist.count };
		}
	},

	// A public link for a playlist (`shared`), or none.
	"music.playlist-share": {
		command: "music play",
		run: async (ctx) => {
			const id = playlistId(ctx);
			const shared = ctx.params.bool("shared", true);
			return {
				playlist: await lib(() => setShared(ctx.actor.id, id, shared))
			};
		}
	},

	// Plays a playlist (`shuffle` to mix it) in the actor's voice channel.
	"music.playlist-play": {
		command: "music play",
		run: async (ctx) => {
			const { playlist, tracks } = await lib(() =>
				playlistTracks(ctx.actor.id, playlistId(ctx))
			);
			return playList(ctx, playlist.name, tracks);
		}
	},

	// Plays the liked tracks, the latest first (at most a playlist's worth).
	"music.favorites-play": {
		command: "music play",
		run: async (ctx) => {
			const tracks = await allFavorites(
				ctx.actor.id,
				MAX_PLAYLIST_TRACKS
			);
			return playList(ctx, ctx.lang.music_library_liked_name, tracks);
		}
	}
};

export { trackKey };
