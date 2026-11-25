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
 * The pure parts of the music library on Discord: the Love button of the
 * now playing panel (musicLove.ts) and /music playlist
 * (musicLibraryPanel.ts). No Discord or database access here.
 */

import { escapeMarkdown } from "discord.js";

import type { DatabaseStructure } from "../../../types/database_structure.js";
import type { LanguageData } from "../../../types/languageData.js";

type LibraryTrack = DatabaseStructure.LibraryTrack;
type LibraryPlaylist = DatabaseStructure.LibraryPlaylist;

export const LIBRARY_PAGE_SIZE = 10;
const TITLE_MAX = 70;
const URL_MAX = 200;

/** What a Love click does: the track can't be kept, like it, or offer to remove it. */
export type LoveAction = "unavailable" | "like" | "offer_remove";

export function loveAction(key: string | null, liked: boolean): LoveAction {
	if (!key) return "unavailable";
	return liked ? "offer_remove" : "like";
}

/** `m:ss`, or `h:mm:ss` past an hour. */
export function formatLibraryDuration(ms: number): string {
	const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = String(total % 60).padStart(2, "0");
	return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export function clip(value: string, max: number): string {
	return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

/** Number of pages (at least one) for `total` items. */
export function pageCount(total: number, size = LIBRARY_PAGE_SIZE): number {
	return Math.max(1, Math.ceil(Math.max(0, total) / size));
}

/** `page` kept inside [0, pages - 1]. */
export function clampPage(
	page: number,
	total: number,
	size = LIBRARY_PAGE_SIZE
): number {
	const last = pageCount(total, size) - 1;
	return Math.min(Math.max(0, Math.floor(page) || 0), last);
}

/** The values of the library's select menu. */
export const LIKED_VALUE = "liked";
export const playlistValue = (id: string) => `pl:${id}`;
export function parseLibraryValue(
	value: string
): { kind: "liked" } | { kind: "playlist"; id: string } | null {
	if (value === LIKED_VALUE) return { kind: "liked" };
	if (value.startsWith("pl:") && value.length > 3)
		return { kind: "playlist", id: value.slice(3) };
	return null;
}

/**
 * The playlist a typed name points to: its id, the same name (any case),
 * else the only one starting with it. `liked` for the liked tracks' name.
 */
export function findLibraryList(
	playlists: Pick<LibraryPlaylist, "id" | "name">[],
	query: string,
	likedName: string
): { kind: "liked" } | { kind: "playlist"; id: string } | null {
	const q = query.trim().toLowerCase();
	if (!q) return null;
	const parsed = parseLibraryValue(query.trim());
	if (parsed?.kind === "liked") return parsed;
	if (parsed && playlists.some((p) => p.id === parsed.id)) return parsed;
	const byId = playlists.find((p) => p.id === q);
	if (byId) return { kind: "playlist", id: byId.id };
	const same = playlists.find((p) => p.name.toLowerCase() === q);
	if (same) return { kind: "playlist", id: same.id };
	if (likedName.toLowerCase() === q) return { kind: "liked" };
	const starts = playlists.filter((p) => p.name.toLowerCase().startsWith(q));
	if (starts.length === 1) return { kind: "playlist", id: starts[0]!.id };
	return null;
}

function linkLabel(value: string): string {
	return escapeMarkdown(value).replaceAll("[", "\\[").replaceAll("]", "\\]");
}

function safeUrl(value?: string | null): string | null {
	if (!value || value.length > URL_MAX) return null;
	try {
		const url = new URL(value);
		return url.protocol === "https:" || url.protocol === "http:"
			? url.toString()
			: null;
	} catch {
		return null;
	}
}

/** One kept track in a list: number, linked title, author · duration. */
export function libraryTrackLine(
	lang: LanguageData,
	track: LibraryTrack,
	index: number
): string {
	const title = `**${linkLabel(clip(track.title || "?", TITLE_MAX))}**`;
	const url = safeUrl(track.uri);
	const meta = [
		escapeMarkdown(clip(track.author || "?", 60)),
		track.isStream
			? lang.nowplaying_live
			: formatLibraryDuration(track.duration)
	];
	return `\`${String(index + 1).padStart(2, "0")}\` ${url ? `[${title}](${url})` : title}\n-# ${meta.join(" · ")}`;
}

/** The overview: the liked tracks then each playlist (tracks · duration). */
export function libraryOverviewLines(
	lang: LanguageData,
	likedCount: number,
	playlists: Pick<LibraryPlaylist, "name" | "count" | "duration">[]
): string[] {
	const tracks = (n: number) =>
		lang.music_playlist_tracks.replace("${count}", String(n));
	const lines = [
		`❤️ **${escapeMarkdown(lang.music_library_liked_name)}**\n-# ${tracks(likedCount)}`
	];
	for (const p of playlists) {
		lines.push(
			`🎵 **${escapeMarkdown(clip(p.name, 60))}**\n-# ${tracks(p.count)} · ${formatLibraryDuration(p.duration)}`
		);
	}
	if (!playlists.length) lines.push(`-# ${lang.music_playlist_no_playlists}`);
	return lines;
}

/** Whether the library holds nothing at all (no liked track, no playlist). */
export function libraryIsEmpty(
	likedCount: number,
	playlists: readonly unknown[]
): boolean {
	return likedCount === 0 && playlists.length === 0;
}
