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
 * Remembered text searches, table `music_search` (shared by every shard).
 *
 * A text query already answered by the audio node is answered again from
 * the database, without a search: same normalized query and same search
 * pipeline (`source`) ⇒ same tracks. A slightly misspelled query reuses a
 * close one (bounded Levenshtein over a per-prefix index, the database has
 * no scan). Links are never remembered (playlists and albums change).
 *
 * Keys never hold a dot (a dot is a path):
 *   `Q_{sha1(q|source)}` → MusicSearchRecord
 *   `B_{source}_{hex of the first 2 characters of q}` → MusicSearchBucket
 *
 * No user id is stored: only the query and the node's answer.
 */

import { createHash } from "node:crypto";
import type { Client, User } from "discord.js";
import type { SearchResult, Track } from "lavalink-client";

import type { DatabaseStructure } from "../../../types/database_structure.js";
import { musicSearchTable } from "../database/tables.js";

type MusicSearchRecord = DatabaseStructure.MusicSearchRecord;
type MusicSearchBucket = DatabaseStructure.MusicSearchBucket;
type CachedTrack = DatabaseStructure.MusicSearchTrack;

/** Search pipelines: never mixed (each has its own records and index). */
export const SEARCH_SOURCE = {
	// searchQueryOnNode's text path: Deezer, SoundCloud, closest title.
	play: "auto",
	// Autocomplete and dashboard search: Deezer, else SoundCloud, 10 tracks.
	suggest: "suggest"
} as const;
export type SearchSource = (typeof SEARCH_SOURCE)[keyof typeof SEARCH_SOURCE];

// A record is trusted for 14 days, then the next search asks the node again.
export const RECORD_TTL_MS = 14 * 24 * 60 * 60 * 1000;
// Tracks kept per record (play uses the first, suggestions show 10).
export const MAX_TRACKS: Record<SearchSource, number> = {
	auto: 5,
	suggest: 10
};
// Entries per fuzzy index bucket, most recently used first.
export const BUCKET_CAP = 500;
// Index buckets kept in memory per shard, and for how long.
const BUCKET_MEMORY_TTL_MS = 5 * 60 * 1000;
const BUCKET_MEMORY_MAX = 256;
// Hit counter written at most once per hour per record.
const HIT_FLUSH_MS = 60 * 60 * 1000;
const HIT_FLUSH_MEMORY_MAX = 5_000;
// Tracks served from a record, to forget the record if one fails to play.
const SERVED_MAX = 2_000;
// Queries shorter than this (normalized) are never fuzzy-matched.
export const FUZZY_MIN_LENGTH = 6;
// Close candidates read from the database at most, best first.
const FUZZY_TRIES = 3;
// Longest normalized query remembered.
const MAX_QUERY_LENGTH = 200;

// "(Official Video)", "[HD]", "(lyrics)"…: dropped only when the whole
// bracket is made of these words.
const NOISE_WORDS = new Set([
	"official",
	"music",
	"video",
	"audio",
	"lyric",
	"lyrics",
	"hd",
	"hq",
	"4k",
	"visualizer",
	"clip",
	"officiel",
	"with",
	"paroles"
]);
// Trailing phrases dropped outside brackets (bare "audio", "hd" or
// "lyrics" stay: they can be part of a title).
const TRAILING_NOISE =
	/\s+(?:official\s+(?:music\s+)?video|official\s+audio|official\s+lyrics?\s+video|lyrics?\s+video|clip\s+officiel)$/u;

/** The query as remembered: lowercase, NFKC, no punctuation, no noise. */
export function normalizeQuery(raw: string): string {
	let q = String(raw ?? "")
		.normalize("NFKC")
		.toLowerCase();
	q = q.replace(/[([{]([^)\]}]*)[)\]}]/gu, (whole, inner: string) => {
		const words = inner
			.replace(/[^\p{L}\p{N}]+/gu, " ")
			.trim()
			.split(" ")
			.filter(Boolean);
		return words.length && words.every((w) => NOISE_WORDS.has(w))
			? " "
			: ` ${inner} `;
	});
	q = q
		.replace(/['’`´]/gu, "")
		.replace(/[^\p{L}\p{N}\s]+/gu, " ")
		.replace(/\s+/gu, " ")
		.trim();
	const stripped = q.replace(TRAILING_NOISE, "").trim();
	return stripped || q;
}

// Same test as musicPlay.isUrlQuery (anything URL can parse), plus "www.…".
function isUrl(query: string): boolean {
	if (/^\s*www\./iu.test(query)) return true;
	try {
		new URL(query.trim());
		return true;
	} catch {
		return false;
	}
}

/** A text search worth remembering (never a link). */
export function cacheableQuery(raw: string): string | null {
	if (!raw || isUrl(raw)) return null;
	const q = normalizeQuery(raw);
	if (!q || q.length > MAX_QUERY_LENGTH) return null;
	return q;
}

export function recordKey(q: string, source: SearchSource): string {
	return `Q_${createHash("sha1").update(`${q}|${source}`).digest("hex")}`;
}

export function bucketKey(q: string, source: SearchSource): string {
	const prefix = Array.from(q).slice(0, 2).join("");
	return `B_${source}_${Buffer.from(prefix, "utf8").toString("hex")}`;
}

/** Levenshtein distance, or max + 1 as soon as it is known to exceed max. */
export function boundedLevenshtein(a: string, b: string, max: number): number {
	const s = Array.from(a);
	const t = Array.from(b);
	if (Math.abs(s.length - t.length) > max) return max + 1;
	if (!s.length) return t.length;
	if (!t.length) return s.length;
	let prev = new Array<number>(t.length + 1);
	let cur = new Array<number>(t.length + 1);
	for (let j = 0; j <= t.length; j++) prev[j] = j;
	for (let i = 1; i <= s.length; i++) {
		cur[0] = i;
		let rowMin = cur[0];
		for (let j = 1; j <= t.length; j++) {
			const cost = s[i - 1] === t[j - 1] ? 0 : 1;
			cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
			if (cur[j] < rowMin) rowMin = cur[j];
		}
		if (rowMin > max) return max + 1;
		[prev, cur] = [cur, prev];
	}
	return prev[t.length] > max ? max + 1 : prev[t.length];
}

/** Largest distance accepted for a query of this length. */
export function fuzzyThreshold(length: number): number {
	return Math.max(1, Math.floor(length * 0.15));
}

const digitsOf = (q: string) => q.replace(/\D+/gu, " ").trim();

/** Distance from q to a remembered query, or null when it is not close enough. */
export function fuzzyDistance(q: string, candidate: string): number | null {
	const len = Array.from(q).length;
	if (len < FUZZY_MIN_LENGTH || q === candidate) return null;
	// "song 1" and "song 2" are different songs.
	if (digitsOf(q) !== digitsOf(candidate)) return null;
	const max = fuzzyThreshold(len);
	const d = boundedLevenshtein(q, candidate, max);
	return d <= max && d < len / 3 ? d : null;
}

// --- memory (bounded) -----------------------------------------------------

const buckets = new Map<
	string,
	{ at: number; entries: MusicSearchBucket["entries"] }
>();
const flushedAt = new Map<string, number>();
// encoded track → record it came from
const served = new Map<
	string,
	{ key: string; q: string; source: SearchSource }
>();

function setBounded<K, V>(map: Map<K, V>, key: K, value: V, max: number): void {
	map.delete(key);
	map.set(key, value);
	while (map.size > max) map.delete(map.keys().next().value as K);
}

async function readBucket(key: string): Promise<MusicSearchBucket["entries"]> {
	const mem = buckets.get(key);
	if (mem && Date.now() - mem.at < BUCKET_MEMORY_TTL_MS) return mem.entries;
	const stored = (await musicSearchTable.get(
		key
	)) as MusicSearchBucket | null;
	const entries = Array.isArray(stored?.entries)
		? stored.entries.filter((e) => e && typeof e.q === "string")
		: [];
	setBounded(buckets, key, { at: Date.now(), entries }, BUCKET_MEMORY_MAX);
	return entries;
}

async function writeBucket(
	key: string,
	entries: MusicSearchBucket["entries"]
): Promise<void> {
	setBounded(buckets, key, { at: Date.now(), entries }, BUCKET_MEMORY_MAX);
	await musicSearchTable.set(key, { entries } satisfies MusicSearchBucket);
}

/** Puts q first in its bucket (most recent first), capped at BUCKET_CAP. */
async function touchBucket(q: string, source: SearchSource): Promise<void> {
	const key = bucketKey(q, source);
	// Fresh read: another shard may have added entries meanwhile.
	buckets.delete(key);
	const entries = (await readBucket(key)).filter((e) => e.q !== q);
	entries.unshift({ q, at: Date.now() });
	await writeBucket(key, entries.slice(0, BUCKET_CAP));
}

async function dropFromBucket(q: string, source: SearchSource): Promise<void> {
	const key = bucketKey(q, source);
	buckets.delete(key);
	const entries = await readBucket(key);
	const kept = entries.filter((e) => e.q !== q);
	if (kept.length !== entries.length) await writeBucket(key, kept);
}

function background(what: string, work: Promise<unknown>): void {
	work.catch((err) =>
		globalThis.logger?.warn?.(`music search cache: ${what} failed:`, err)
	);
}

// --- records ---------------------------------------------------------------

function validRecord(
	value: unknown,
	q: string,
	source: SearchSource,
	now: number
): value is MusicSearchRecord {
	const r = value as MusicSearchRecord | null;
	return (
		!!r &&
		r.q === q &&
		r.source === source &&
		typeof r.at === "number" &&
		now - r.at < RECORD_TTL_MS &&
		Array.isArray(r.tracks) &&
		r.tracks.length > 0 &&
		r.tracks.every((t) => typeof t?.encoded === "string" && !!t.info)
	);
}

export interface SearchCacheHit {
	key: string;
	record: MusicSearchRecord;
	fuzzy: boolean;
}

function countHit(key: string, record: MusicSearchRecord): void {
	const now = Date.now();
	if (now - (flushedAt.get(key) ?? 0) < HIT_FLUSH_MS) return;
	setBounded(flushedAt, key, now, HIT_FLUSH_MEMORY_MAX);
	background(
		"hit",
		(async () => {
			await musicSearchTable.set(key, {
				...record,
				hits: (record.hits ?? 0) + 1,
				lastHit: now
			} satisfies MusicSearchRecord);
			await touchBucket(record.q, record.source);
		})()
	);
}

/** The remembered answer to a text query: exact, else a close one. */
export async function lookupSearch(
	raw: string,
	source: SearchSource
): Promise<SearchCacheHit | null> {
	const q = cacheableQuery(raw);
	if (!q) return null;
	const now = Date.now();

	const key = recordKey(q, source);
	const exact = await musicSearchTable.get(key);
	if (validRecord(exact, q, source, now)) {
		countHit(key, exact);
		return { key, record: exact, fuzzy: false };
	}

	if (Array.from(q).length < FUZZY_MIN_LENGTH) return null;
	const candidates: Array<{ q: string; d: number }> = [];
	for (const entry of await readBucket(bucketKey(q, source))) {
		const d = fuzzyDistance(q, entry.q);
		if (d !== null) candidates.push({ q: entry.q, d });
	}
	candidates.sort((a, b) => a.d - b.d);
	for (const candidate of candidates.slice(0, FUZZY_TRIES)) {
		const k = recordKey(candidate.q, source);
		const record = await musicSearchTable.get(k);
		if (validRecord(record, candidate.q, source, now)) {
			countHit(k, record);
			return { key: k, record, fuzzy: true };
		}
	}
	return null;
}

function toCachedTrack(track: Track): CachedTrack | null {
	if (!track?.encoded || !track.info) return null;
	const info = track.info;
	return {
		encoded: track.encoded,
		info: {
			identifier: info.identifier,
			title: info.title,
			author: info.author,
			length: info.duration ?? 0,
			artworkUrl: info.artworkUrl ?? null,
			uri: info.uri ?? null,
			sourceName: info.sourceName,
			isSeekable: !!info.isSeekable,
			isStream: !!info.isStream,
			isrc: info.isrc ?? null
		},
		pluginInfo: JSON.parse(JSON.stringify(track.pluginInfo ?? {}))
	};
}

/**
 * Remembers the node's answer (copied now, written in the background: the
 * caller may change the tracks afterwards). Only successful text searches.
 */
export function saveSearch(
	raw: string,
	source: SearchSource,
	res: SearchResult | undefined | null
): Promise<void> | null {
	const q = cacheableQuery(raw);
	if (!q || !res) return null;
	if (res.loadType !== "search" && res.loadType !== "track") return null;
	const tracks = (res.tracks ?? [])
		.slice(0, MAX_TRACKS[source])
		.map((t) => toCachedTrack(t as Track))
		.filter((t): t is CachedTrack => !!t);
	if (!tracks.length || !tracks[0].info.title) return null;

	const key = recordKey(q, source);
	const record: MusicSearchRecord = {
		q,
		raw: String(raw).slice(0, MAX_QUERY_LENGTH),
		source,
		tracks,
		loadType: res.loadType,
		at: Date.now(),
		hits: 0
	};
	const work = (async () => {
		await musicSearchTable.set(key, record);
		await touchBucket(q, source);
	})();
	background("save", work);
	return work.catch(() => undefined);
}

/** The record as a search result, tracks rebuilt for this requester. */
export function cachedResult(
	client: Client,
	hit: SearchCacheHit,
	requester: User | unknown
): SearchResult {
	const tracks = hit.record.tracks.map((t) => {
		const track = client.player.utils.buildTrack(
			JSON.parse(JSON.stringify(t)) as never,
			requester as never
		) as Track;
		setBounded(
			served,
			track.encoded!,
			{ key: hit.key, q: hit.record.q, source: hit.record.source },
			SERVED_MAX
		);
		return track;
	});
	return {
		loadType: hit.record.loadType === "track" ? "track" : "search",
		tracks,
		playlist: null,
		exception: null,
		pluginInfo: {}
	} as unknown as SearchResult;
}

/**
 * A track that failed to play: if it came from a record, forget the record
 * (and its index entry) so the next search asks the node again.
 */
export async function forgetFailedTrack(
	encoded: string | undefined | null
): Promise<boolean> {
	if (!encoded) return false;
	const origin = served.get(encoded);
	if (!origin) return false;
	for (const [enc, o] of served) if (o.key === origin.key) served.delete(enc);
	flushedAt.delete(origin.key);
	await musicSearchTable.delete(origin.key);
	await dropFromBucket(origin.q, origin.source);
	return true;
}

/** Tests only. */
export const __searchCacheTest = {
	reset(): void {
		buckets.clear();
		flushedAt.clear();
		served.clear();
	},
	buckets,
	served
};
