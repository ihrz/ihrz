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
 * Track lyrics, served by the Wavyzon node (lyrics.ovh behind its
 * LavaLyrics-shaped `/v4/lyrics` route) and cached in the `lyrics` table by
 * ISRC.
 *
 * - A text query is first resolved to a track on the nodes; callers that
 *   already hold the track pass it directly.
 * - With an ISRC, a valid cached entry is returned without asking the node:
 *   found lyrics are kept, a "none found" answer is trusted for
 *   MISSING_TTL_MS, anything else (old format, malformed, expired miss) is
 *   fetched again and the entry rewritten.
 * - The route is called with `node.request`, not `node.lyrics.get`: that
 *   helper refuses nodes without a LavaSrc-style lyrics source plugin, and
 *   Wavyzon is not one (see its docs, "Lavalink compatibility").
 * - A failed lookup (node down, lyrics.ovh error) is not cached.
 */

import { User } from "discord.js";
import { LavalinkNode, SearchResult, Track } from "lavalink-client";

import type { DatabaseStructure } from "../../../types/database_structure.js";

type LyricsEntry = DatabaseStructure.LyricsCacheEntry;

export interface LyricsData {
	text: string;
	provider: string;
	// Synced lyrics (timed lines), when the node has them.
	lines?: DatabaseStructure.LyricsLine[];
}

const MAX_LINES = 2000;

/** The node's LavaLyrics `lines` ({timestamp, duration, line}, ms) as LyricsLine. */
export function toLyricsLines(raw: unknown): DatabaseStructure.LyricsLine[] {
	if (!Array.isArray(raw)) return [];
	const lines = raw
		.filter(
			(l) =>
				l &&
				typeof l.timestamp === "number" &&
				Number.isFinite(l.timestamp) &&
				typeof l.line === "string"
		)
		.slice(0, MAX_LINES)
		.map((l) => ({
			start: Math.max(0, Math.round(l.timestamp)),
			duration:
				typeof l.duration === "number" ? Math.max(0, l.duration) : 0,
			text: String(l.line).trim().slice(0, 500)
		}))
		.sort((a, b) => a.start - b.start);
	// A line without a duration lasts until the next one (5 s for the last).
	return lines.map((l, i) => ({
		start: l.start,
		end: l.duration
			? l.start + Math.round(l.duration)
			: (lines[i + 1]?.start ?? l.start + 5000),
		text: l.text
	}));
}

/** A "no lyrics" answer is asked again after this long. */
const MISSING_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const ISRC = /^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/;

function normalizeIsrc(value?: string | null): string | null {
	const isrc = (value ?? "").replace(/[\s-]/g, "").toUpperCase();
	return ISRC.test(isrc) ? isrc : null;
}

/** A cached entry usable as is: lyrics, or a recent "none found". */
function validEntry(entry: unknown): entry is LyricsEntry {
	if (!entry || typeof entry !== "object") return false;
	const e = entry as Partial<LyricsEntry>;
	if (e.v !== 1 || typeof e.fetchedAt !== "number") return false;
	// Written before synced lyrics: asked again once for the timed lines.
	if (typeof e.text === "string")
		return e.text.trim().length > 0 && Array.isArray(e.lines);
	return e.text === null && Date.now() - e.fetchedAt < MISSING_TTL_MS;
}

function connectedNode(): LavalinkNode | null {
	for (const node of client.player.nodeManager.nodes.values()) {
		if (node.connected) return node;
	}
	return null;
}

async function findTrack(query: string, author?: User): Promise<Track | null> {
	for (const node of client.player.nodeManager.nodes.values()) {
		if (!node.connected) continue;
		const res: SearchResult | undefined = await node
			.search({ query }, author || client.user)
			.catch(() => undefined);
		if (res?.tracks.length) return res.tracks[0] as Track;
	}
	return null;
}

/** The node's answer: lyrics, null for none, undefined when it failed. */
async function fetchFromNode(
	track: Track
): Promise<LyricsData | null | undefined> {
	const node = connectedNode();
	if (!node || !track.encoded) return undefined;
	try {
		const res = (await node.request(
			`/lyrics?track=${encodeURIComponent(track.encoded)}`
		)) as
			| { text?: string | null; provider?: string; lines?: unknown }
			| undefined;
		// 204 No Content (none found) resolves to undefined.
		const text = res?.text?.trim();
		return text
			? {
					text,
					provider: res?.provider || "lyrics.ovh",
					lines: toLyricsLines(res?.lines)
				}
			: null;
	} catch (error) {
		logger.warn(`lyrics lookup failed: ${String(error)}`);
		return undefined;
	}
}

export default async function getLyrics(
	query: string | Track,
	author?: User
): Promise<{ track: Track | undefined; res: LyricsData } | null> {
	const track =
		typeof query === "string" ? await findTrack(query, author) : query;
	if (!track) return null;

	const isrc = normalizeIsrc(track.info.isrc);
	const table = isrc
		? await client.db.table<LyricsEntry>("lyrics").catch(() => null)
		: null;

	if (isrc && table) {
		const cached = await table.get(isrc).catch(() => null);
		if (validEntry(cached)) {
			return cached.text
				? {
						track,
						res: {
							text: cached.text,
							provider: cached.provider || "lyrics.ovh",
							lines: cached.lines ?? []
						}
					}
				: null;
		}
	}

	const found = await fetchFromNode(track);
	if (found === undefined) return null;

	if (isrc && table) {
		const entry: LyricsEntry = {
			v: 1,
			fetchedAt: Date.now(),
			text: found?.text ?? null,
			provider: found?.provider,
			sourceName: track.info.sourceName,
			lines: found?.lines ?? []
		};
		await table.set(isrc, entry).catch(() => null);
	}

	return found ? { track, res: found } : null;
}
