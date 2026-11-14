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

/*
 * Each user's music library: playlists and liked tracks, table
 * `music_library`, format in types/database_structure.d.ts ("Music library").
 * Personal: a user only ever reads and changes their own (the dashboard's
 * `music.library*` actions run as the actor). Tracks are kept with their
 * encoded form, so a playlist plays without searching each track again.
 *
 * Limits: 20 playlists, 400 tracks each, 5000 liked tracks. The writes of one
 * user are queued (one shard); the liked keys are cached a minute, they are
 * read on every poll of the dashboard's player.
 */

import { randomBytes } from "node:crypto";

import type { Track, UnresolvedTrack } from "lavalink-client";

import type { DatabaseStructure } from "../../../types/database_structure.js";
import { musicLibraryTable } from "../database/tables.js";

type LibraryTrack = DatabaseStructure.LibraryTrack;
type LibraryPlaylist = DatabaseStructure.LibraryPlaylist;

export const MAX_PLAYLISTS = 20;
export const MAX_PLAYLIST_TRACKS = 400;
export const MAX_FAVORITES = 5000;
export const FAVORITES_PAGE = 250;
export const NAME_MAX = 50;

const plKey = (user: string) => `PL_${user}`;
const ptKey = (user: string, id: string) => `PT_${user}_${id}`;
const fiKey = (user: string) => `FI_${user}`;
const fpKey = (user: string, page: number) => `FP_${user}_${page}`;
const shareKey = (shareId: string) => `SHARE_${shareId}`;

// A public link's id: 12 letters and digits, at least one letter (never
// mistaken for a numeric playlist id of a music site).
export const SHARE_ID = /^(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{12}$/;
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// Where iHorizon's shared playlists live (HorizonGateway `[dashboard]
// musicDomain`); also in the allowed links (isAllowedLinks.ts).
export const SHARE_HOSTS: readonly string[] = ["music.ihorizon.org"];

/**
 * The id of an iHorizon shared playlist link
 * (`https://music.ihorizon.org/playlist/{shareId}`), else null. Only the
 * address is read: the tracks come from the bot's own library
 * (`sharedPlaylist`), nothing is downloaded from that site.
 */
export function shareIdFromUrl(url: string): string | null {
	try {
		const { hostname, pathname } = new URL(url);
		if (!SHARE_HOSTS.includes(hostname.toLowerCase().replace(/^www\./, "")))
			return null;
		const id = pathname.match(/^\/playlist\/([A-Za-z0-9]+)\/?$/)?.[1];
		return id && SHARE_ID.test(id) ? id : null;
	} catch {
		return null;
	}
}

export function newShareId(): string {
	for (;;) {
		const id = [...randomBytes(12)].map((b) => BASE62[b % 62]).join("");
		if (SHARE_ID.test(id)) return id;
	}
}

export class LibraryError extends Error {}
const refuse = (message: string): never => {
	throw new LibraryError(message);
};

// One write at a time per user.
const queues = new Map<string, Promise<unknown>>();
function serial<T>(user: string, run: () => Promise<T>): Promise<T> {
	const prev = queues.get(user) ?? Promise.resolve();
	const next = prev.catch(() => null).then(run);
	queues.set(user, next);
	void next
		.catch(() => null)
		.finally(() => {
			if (queues.get(user) === next) queues.delete(user);
		});
	return next;
}

/** The key that makes a track unique in a list. */
export function trackKey(track: {
	info?: { sourceName?: string | null; identifier?: string | null };
}): string | null {
	const id = track.info?.identifier;
	if (!id) return null;
	return `${track.info?.sourceName || "unknown"}:${id}`.slice(0, 300);
}

/** A playing or queued track, as kept in a library (null: not keepable). */
export function toLibraryTrack(
	track: Track | UnresolvedTrack | null | undefined,
	at = Date.now()
): LibraryTrack | null {
	if (!track?.encoded || !track.info) return null;
	const key = trackKey(track);
	if (!key) return null;
	const info = track.info as Track["info"];
	return {
		key,
		encoded: track.encoded,
		identifier: info.identifier,
		title: String(info.title ?? "").slice(0, 300),
		author: String(info.author ?? "").slice(0, 200),
		uri: info.uri ?? null,
		artworkUrl: info.artworkUrl ?? null,
		duration: info.isStream ? 0 : Math.max(0, Number(info.duration) || 0),
		isStream: !!info.isStream,
		isSeekable: info.isSeekable !== false,
		sourceName: info.sourceName ?? "unknown",
		isrc: info.isrc ?? null,
		at
	};
}

/** What lavalink-client's ManagerUtils.buildTrack takes back. */
export function toLavalinkTrack(track: LibraryTrack) {
	return {
		encoded: track.encoded,
		info: {
			identifier: track.identifier,
			title: track.title,
			author: track.author,
			length: track.duration,
			artworkUrl: track.artworkUrl,
			uri: track.uri ?? "",
			sourceName: track.sourceName,
			isSeekable: track.isSeekable,
			isStream: track.isStream,
			isrc: track.isrc
		},
		pluginInfo: {}
	};
}

export function cleanName(name: string): string {
	return name.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
}

const summary = (
	base: Pick<LibraryPlaylist, "id" | "name" | "createdAt">,
	tracks: LibraryTrack[]
): LibraryPlaylist => ({
	...base,
	updatedAt: Date.now(),
	count: tracks.length,
	duration: tracks.reduce((n, t) => n + (t.isStream ? 0 : t.duration), 0),
	cover: tracks.find((t) => t.artworkUrl)?.artworkUrl ?? null
});

// ---- Playlists ----

export async function listPlaylists(user: string): Promise<LibraryPlaylist[]> {
	const doc = (await musicLibraryTable.get(
		plKey(user)
	)) as DatabaseStructure.LibraryPlaylists | null;
	return Array.isArray(doc?.playlists) ? doc.playlists : [];
}

const savePlaylists = (user: string, playlists: LibraryPlaylist[]) =>
	musicLibraryTable.set(plKey(user), { playlists });

async function findPlaylist(user: string, id: string) {
	const playlists = await listPlaylists(user);
	const index = playlists.findIndex((p) => p.id === id);
	if (index < 0) refuse("playlist not found");
	return { playlists, index, playlist: playlists[index]! };
}

export async function playlistTracks(
	user: string,
	id: string
): Promise<{ playlist: LibraryPlaylist; tracks: LibraryTrack[] }> {
	const { playlist } = await findPlaylist(user, id);
	const tracks = (await musicLibraryTable.get(ptKey(user, id))) as
		LibraryTrack[] | null;
	return { playlist, tracks: Array.isArray(tracks) ? tracks : [] };
}

export function createPlaylist(
	user: string,
	rawName: string,
	first: LibraryTrack[] = []
): Promise<LibraryPlaylist> {
	return serial(user, async () => {
		const name = cleanName(rawName);
		if (!name) refuse("the playlist needs a name");
		const playlists = await listPlaylists(user);
		if (playlists.length >= MAX_PLAYLISTS)
			refuse(`at most ${MAX_PLAYLISTS} playlists`);
		if (playlists.some((p) => p.name.toLowerCase() === name.toLowerCase()))
			refuse("a playlist already has this name");
		let id = "";
		do id = randomBytes(4).toString("hex");
		while (playlists.some((p) => p.id === id));
		const tracks = dedupe(first).slice(0, MAX_PLAYLIST_TRACKS);
		const playlist = summary({ id, name, createdAt: Date.now() }, tracks);
		await musicLibraryTable.set(ptKey(user, id), tracks);
		await savePlaylists(user, [...playlists, playlist]);
		return playlist;
	});
}

export function renamePlaylist(
	user: string,
	id: string,
	rawName: string
): Promise<LibraryPlaylist> {
	return serial(user, async () => {
		const name = cleanName(rawName);
		if (!name) refuse("the playlist needs a name");
		const { playlists, index } = await findPlaylist(user, id);
		if (
			playlists.some(
				(p) =>
					p.id !== id && p.name.toLowerCase() === name.toLowerCase()
			)
		)
			refuse("a playlist already has this name");
		playlists[index] = {
			...playlists[index]!,
			name,
			updatedAt: Date.now()
		};
		await savePlaylists(user, playlists);
		return playlists[index]!;
	});
}

export function deletePlaylist(user: string, id: string): Promise<void> {
	return serial(user, async () => {
		const { playlists, playlist } = await findPlaylist(user, id);
		await savePlaylists(
			user,
			playlists.filter((p) => p.id !== id)
		);
		await musicLibraryTable.delete(ptKey(user, id));
		if (playlist.shareId)
			await musicLibraryTable.delete(shareKey(playlist.shareId));
	});
}

function dedupe(tracks: LibraryTrack[]): LibraryTrack[] {
	const seen = new Set<string>();
	return tracks.filter((t) => !seen.has(t.key) && seen.add(t.key));
}

// Changes the tracks of a playlist and keeps its summary in step.
function editTracks<T>(
	user: string,
	id: string,
	edit: (tracks: LibraryTrack[]) => { tracks: LibraryTrack[]; result: T }
): Promise<{ playlist: LibraryPlaylist; result: T }> {
	return serial(user, async () => {
		const { playlists, index, playlist } = await findPlaylist(user, id);
		const stored = (await musicLibraryTable.get(ptKey(user, id))) as
			LibraryTrack[] | null;
		const { tracks, result } = edit(Array.isArray(stored) ? stored : []);
		const next = summary(playlist, tracks);
		playlists[index] = next;
		await musicLibraryTable.set(ptKey(user, id), tracks);
		await savePlaylists(user, playlists);
		return { playlist: next, result };
	});
}

/** Adds tracks at the end; the ones already there are skipped. */
export function addToPlaylist(user: string, id: string, add: LibraryTrack[]) {
	return editTracks<{ added: number; skipped: number }>(
		user,
		id,
		(tracks) => {
			const have = new Set(tracks.map((t) => t.key));
			const fresh = dedupe(add).filter((t) => !have.has(t.key));
			if (!fresh.length)
				return { tracks, result: { added: 0, skipped: 0 } };
			if (tracks.length >= MAX_PLAYLIST_TRACKS)
				refuse(
					`a playlist holds at most ${MAX_PLAYLIST_TRACKS} tracks`
				);
			const room = MAX_PLAYLIST_TRACKS - tracks.length;
			const kept = fresh.slice(0, room);
			return {
				tracks: [...tracks, ...kept],
				result: {
					added: kept.length,
					skipped: fresh.length - kept.length
				}
			};
		}
	);
}

export function removeFromPlaylist(user: string, id: string, key: string) {
	return editTracks(user, id, (tracks) => {
		const next = tracks.filter((t) => t.key !== key);
		if (next.length === tracks.length) refuse("track not found");
		return { tracks: next, result: null };
	});
}

export function movePlaylistTrack(
	user: string,
	id: string,
	from: number,
	to: number
) {
	return editTracks(user, id, (tracks) => {
		if (from >= tracks.length || to >= tracks.length)
			refuse("track not found");
		const next = [...tracks];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved!);
		return { tracks: next, result: null };
	});
}

// ---- Liked tracks ----

const keysCache = new Map<string, { at: number; keys: Set<string> }>();
const KEYS_TTL = 60_000;
// Bumped by each like / unlike: a read that started before it (music.state
// polls all the time) must not put the old hearts back in the cache.
const keysGen = new Map<string, number>();

/** After a write: the cache holds what was just written, older reads are void. */
function keysWritten(
	user: string,
	index: DatabaseStructure.LibraryFavoritesIndex
): void {
	keysGen.set(user, (keysGen.get(user) ?? 0) + 1);
	keysCache.set(user, { at: Date.now(), keys: new Set(index.pages.flat()) });
}

async function favoritesIndex(
	user: string
): Promise<DatabaseStructure.LibraryFavoritesIndex> {
	const doc = (await musicLibraryTable.get(
		fiKey(user)
	)) as DatabaseStructure.LibraryFavoritesIndex | null;
	return { pages: Array.isArray(doc?.pages) ? doc.pages : [] };
}

/** The keys of the user's liked tracks. */
export async function favoriteKeys(user: string): Promise<Set<string>> {
	const hit = keysCache.get(user);
	if (hit && Date.now() - hit.at < KEYS_TTL) return hit.keys;
	const gen = keysGen.get(user) ?? 0;
	const keys = new Set((await favoritesIndex(user)).pages.flat());
	// A like landed while this read was out: what it read is already old.
	if ((keysGen.get(user) ?? 0) !== gen)
		return keysCache.get(user)?.keys ?? keys;
	keysCache.set(user, { at: Date.now(), keys });
	return keys;
}

export async function favoritesCount(user: string): Promise<number> {
	return (await favoriteKeys(user)).size;
}

/** Likes (or unlikes) a track. Answers whether it is liked now. */
export function setFavorite(
	user: string,
	track: LibraryTrack,
	liked: boolean
): Promise<boolean> {
	return serial(user, async () => {
		const index = await favoritesIndex(user);
		const pageOf = index.pages.findIndex((p) => p.includes(track.key));
		if (liked === pageOf >= 0) return liked;
		if (!liked) {
			await removeFavoriteAt(user, index, pageOf, track.key);
			return false;
		}
		if (index.pages.reduce((n, p) => n + p.length, 0) >= MAX_FAVORITES)
			refuse(`at most ${MAX_FAVORITES} liked tracks`);
		let last = index.pages.length - 1;
		if (last < 0 || index.pages[last]!.length >= FAVORITES_PAGE) {
			index.pages.push([]);
			last++;
		}
		const stored = (await musicLibraryTable.get(fpKey(user, last))) as
			LibraryTrack[] | null;
		const page = Array.isArray(stored) ? stored : [];
		page.push(track);
		index.pages[last]!.push(track.key);
		await musicLibraryTable.set(fpKey(user, last), page);
		await musicLibraryTable.set(fiKey(user), index);
		keysWritten(user, index);
		return true;
	});
}

/** Unlikes a track by its key. */
export function removeFavorite(user: string, key: string): Promise<void> {
	return serial(user, async () => {
		const index = await favoritesIndex(user);
		const pageOf = index.pages.findIndex((p) => p.includes(key));
		if (pageOf < 0) refuse("track not found");
		await removeFavoriteAt(user, index, pageOf, key);
	});
}

async function removeFavoriteAt(
	user: string,
	index: DatabaseStructure.LibraryFavoritesIndex,
	page: number,
	key: string
): Promise<void> {
	const stored = (await musicLibraryTable.get(fpKey(user, page))) as
		LibraryTrack[] | null;
	const tracks = (Array.isArray(stored) ? stored : []).filter(
		(t) => t.key !== key
	);
	index.pages[page] = index.pages[page]!.filter((k) => k !== key);
	// An emptied last page goes; a page in the middle stays (keys move nowhere).
	if (!index.pages[page]!.length && page === index.pages.length - 1) {
		index.pages.pop();
		await musicLibraryTable.delete(fpKey(user, page));
	} else {
		await musicLibraryTable.set(fpKey(user, page), tracks);
	}
	await musicLibraryTable.set(fiKey(user), index);
	keysWritten(user, index);
}

/** Liked tracks, the latest first: `offset`, `limit` over all of them. */
export async function favoritesPage(
	user: string,
	offset: number,
	limit: number
): Promise<{ count: number; tracks: LibraryTrack[] }> {
	const { pages } = await favoritesIndex(user);
	const count = pages.reduce((n, p) => n + p.length, 0);
	const out: LibraryTrack[] = [];
	let skip = offset;
	for (let n = pages.length - 1; n >= 0 && out.length < limit; n--) {
		const size = pages[n]!.length;
		if (skip >= size) {
			skip -= size;
			continue;
		}
		const stored = (await musicLibraryTable.get(fpKey(user, n))) as
			LibraryTrack[] | null;
		const page = (Array.isArray(stored) ? stored : []).slice().reverse();
		out.push(...page.slice(skip, skip + (limit - out.length)));
		skip = 0;
	}
	return { count, tracks: out };
}

/** A liked track by its key, or null. */
export async function findFavorite(
	user: string,
	key: string
): Promise<LibraryTrack | null> {
	const { pages } = await favoritesIndex(user);
	const n = pages.findIndex((p) => p.includes(key));
	if (n < 0) return null;
	const stored = (await musicLibraryTable.get(fpKey(user, n))) as
		LibraryTrack[] | null;
	return (
		(Array.isArray(stored) ? stored : []).find((t) => t.key === key) ?? null
	);
}

/** Every liked track, the latest first (to play them). */
export async function allFavorites(
	user: string,
	max = MAX_FAVORITES
): Promise<LibraryTrack[]> {
	return (await favoritesPage(user, 0, max)).tracks;
}

// ---- Public links ----

/** Gives a playlist a public link (or takes it away). */
export function setShared(
	user: string,
	id: string,
	shared: boolean
): Promise<LibraryPlaylist> {
	return serial(user, async () => {
		const { playlists, index, playlist } = await findPlaylist(user, id);
		if (shared && !playlist.shareId) {
			let shareId = newShareId();
			while (await musicLibraryTable.has(shareKey(shareId)))
				shareId = newShareId();
			const link: DatabaseStructure.LibraryShare = {
				userId: user,
				playlistId: id
			};
			await musicLibraryTable.set(shareKey(shareId), link);
			playlists[index] = { ...playlist, shareId };
		} else if (!shared && playlist.shareId) {
			await musicLibraryTable.delete(shareKey(playlist.shareId));
			playlists[index] = { ...playlist, shareId: null };
		} else return playlist;
		await savePlaylists(user, playlists);
		return playlists[index]!;
	});
}

/** A playlist behind a public link, while it is still shared. */
export async function sharedPlaylist(shareId: string): Promise<{
	userId: string;
	playlist: LibraryPlaylist;
	tracks: LibraryTrack[];
} | null> {
	if (!SHARE_ID.test(shareId)) return null;
	const link = (await musicLibraryTable.get(
		shareKey(shareId)
	)) as DatabaseStructure.LibraryShare | null;
	if (!link?.userId || !link.playlistId) return null;
	const playlist = (await listPlaylists(link.userId)).find(
		(p) => p.id === link.playlistId && p.shareId === shareId
	);
	if (!playlist) return null;
	const tracks = (await musicLibraryTable.get(
		ptKey(link.userId, playlist.id)
	)) as LibraryTrack[] | null;
	return {
		userId: link.userId,
		playlist,
		tracks: Array.isArray(tracks) ? tracks : []
	};
}

/** `name`, or `name (2)`, `name (3)`… when the user already has it. */
export async function freeName(user: string, raw: string): Promise<string> {
	const base = cleanName(raw) || "Playlist";
	const taken = new Set(
		(await listPlaylists(user)).map((p) => p.name.toLowerCase())
	);
	if (!taken.has(base.toLowerCase())) return base;
	for (let n = 2; n < 100; n++) {
		const suffix = ` (${n})`;
		const name = base.slice(0, NAME_MAX - suffix.length) + suffix;
		if (!taken.has(name.toLowerCase())) return name;
	}
	return base;
}

/** Tests only. */
export const __libraryTest = { keysCache, keysGen, queues };
