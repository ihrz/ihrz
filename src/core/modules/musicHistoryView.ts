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

// What /music history shows, computed from the stored history: the 30-day
// window, statistics, pages and the text export. No Discord or database
// access here, so it is testable on its own.

import type { DatabaseStructure } from "../../../types/database_structure.js";

type Track = DatabaseStructure.MusicHistoryTrack;

export const HISTORY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const HISTORY_PAGE_SIZE = 5;

/** The stored `{guildId}.MUSIC_HISTORY` object (older fields included). */
export interface StoredHistory {
	tracks?: Track[];
	embed?: string[];
	buffer?: string[];
}

/** Entries of the last 30 days. `changed` tells whether anything was cut. */
export function pruneHistory(
	stored: StoredHistory | null | undefined,
	now: number
): { history: StoredHistory; changed: boolean } {
	const since = now - HISTORY_RETENTION_MS;
	const tracks = (Array.isArray(stored?.tracks) ? stored.tracks : []).filter(
		(t) => t && typeof t.at === "number" && t.at >= since
	);
	const embed: string[] = [];
	const buffer: string[] = [];
	const oldEmbed = Array.isArray(stored?.embed) ? stored.embed : [];
	oldEmbed.forEach((entry, i) => {
		// Older entries carry a Discord timestamp `<t:…:R>`; keep the ones
		// without one rather than guess.
		const m = typeof entry === "string" ? entry.match(/<t:(\d+):/) : null;
		if (!m || parseInt(m[1], 10) * 1000 >= since) {
			embed.push(entry);
			if (stored?.buffer?.[i] !== undefined)
				buffer.push(stored.buffer[i]);
		}
	});
	const changed =
		tracks.length !== (stored?.tracks?.length ?? 0) ||
		embed.length !== oldEmbed.length;
	return { history: { tracks, embed, buffer }, changed };
}

export interface HistorySummary {
	count: number;
	/** Sum of known durations, in ms. */
	totalMs: number;
	topArtist: { name: string; count: number } | null;
	topRequester: { id: string; count: number } | null;
}

function topOf<K>(counts: Map<K, number>): { key: K; count: number } | null {
	let best: { key: K; count: number } | null = null;
	for (const [key, count] of counts) {
		if (!best || count > best.count) best = { key, count };
	}
	return best;
}

export function summarize(tracks: Track[]): HistorySummary {
	const artists = new Map<string, number>();
	const requesters = new Map<string, number>();
	let totalMs = 0;
	for (const t of tracks) {
		if (typeof t.duration === "number" && t.duration > 0) {
			totalMs += t.duration;
		}
		const artist = t.author?.trim();
		if (artist) artists.set(artist, (artists.get(artist) ?? 0) + 1);
		if (t.requesterId) {
			requesters.set(
				t.requesterId,
				(requesters.get(t.requesterId) ?? 0) + 1
			);
		}
	}
	const artist = topOf(artists);
	const requester = topOf(requesters);
	return {
		count: tracks.length,
		totalMs,
		// A "top" that played once is no highlight.
		topArtist:
			artist && artist.count > 1
				? { name: artist.key, count: artist.count }
				: null,
		topRequester:
			requester && requester.count > 1
				? { id: requester.key, count: requester.count }
				: null
	};
}

/** `3:20`, `1:02:05`. */
export function formatTrackDuration(
	ms: number | null | undefined
): string | null {
	if (typeof ms !== "number" || ms <= 0) return null;
	const total = Math.round(ms / 1000);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const ss = String(s).padStart(2, "0");
	return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** `42 min`, `7 h 05`, `2 d 3 h`: listening time at a glance. */
export function formatListeningTime(ms: number): string {
	const minutes = Math.round(ms / 60_000);
	if (minutes < 60) return `${minutes} min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24)
		return `${hours} h ${String(minutes % 60).padStart(2, "0")}`;
	return `${Math.floor(hours / 24)} d ${hours % 24} h`;
}

/** Newest first. */
export function newestFirst(tracks: Track[]): Track[] {
	return [...tracks].sort((a, b) => b.at - a.at);
}

export function pageCount(total: number, size = HISTORY_PAGE_SIZE): number {
	return Math.max(1, Math.ceil(total / size));
}

export function pageOf<T>(
	items: T[],
	page: number,
	size = HISTORY_PAGE_SIZE
): T[] {
	return items.slice(page * size, page * size + size);
}

/** Up to `n` artworks of the newest tracks, one per release. */
export function recentArtworks(tracks: Track[], n = 4): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const t of newestFirst(tracks)) {
		const url = safeHttpUrl(t.artworkUrl);
		if (!url || seen.has(url)) continue;
		seen.add(url);
		out.push(url);
		if (out.length === n) break;
	}
	return out;
}

export function safeHttpUrl(value?: string | null): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		return url.protocol === "https:" || url.protocol === "http:"
			? url.toString()
			: null;
	} catch {
		return null;
	}
}

/** One line per play, newest first, for the export file. */
export function exportText(
	guildName: string,
	tracks: Track[],
	userName: (id: string) => string | null
): string {
	const lines = [
		`Music history of ${guildName} (last 30 days, newest first)`,
		""
	];
	for (const t of newestFirst(tracks)) {
		const when =
			new Date(t.at).toISOString().replace("T", " ").slice(0, 16) +
			" UTC";
		const who = t.requesterId
			? (userName(t.requesterId) ?? t.requesterId)
			: "-";
		const parts = [
			when,
			t.author ? `${t.title} - ${t.author}` : t.title,
			formatTrackDuration(t.duration) ?? "live",
			t.source ?? "-",
			`requested by ${who}`,
			t.uri ?? ""
		];
		lines.push(parts.filter(Boolean).join(" | "));
	}
	return lines.join("\n") + "\n";
}
