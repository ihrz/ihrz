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
 * Native YouTube metadata extractor, in the style of the other extractors:
 * no API key, no library — the public pages only.
 *
 * - A playlist (`list=` in the link, youtube.com or music.youtube.com):
 *   the `ytInitialData` JSON of https://www.youtube.com/playlist?list=…
 *   (first page, 100 videos at most), new layout (`lockupViewModel`) and
 *   the older one (`playlistVideoRenderer`). A mix (`RD…`) has no playlist
 *   page: the playlist panel of its watch page is read instead.
 * - A single video: the public oEmbed endpoint (title and channel).
 *
 * Titles are split into artist and title ("Radiohead - No Surprises") and
 * cleaned of "(Official Video)" and the like, for the Deezer search.
 */

import type { RawPlaylist, RawTrack } from "../common/types.js";
import { fetchJson, fetchText } from "../common/http.js";
import { clockToSeconds } from "../common/parse.js";

const HOSTS = ["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"];
const ID = /^[A-Za-z0-9_-]{2,64}$/;

// The EU consent page is skipped (no tracking choice is made for anyone).
const HEADERS = {
	accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	cookie: "SOCS=CAI; CONSENT=YES+1"
};
const TIMEOUT_MS = 15_000;

function parsed(input: string): URL | null {
	try {
		const url = new URL(input);
		const host = url.hostname.toLowerCase().replace(/^www\./, "");
		return HOSTS.includes(host) ? url : null;
	} catch {
		return null;
	}
}

/** The playlist id of a YouTube link (`list=`), else null. */
export function youtubeListId(input: string): string | null {
	const id = parsed(input)?.searchParams.get("list") ?? null;
	return id && ID.test(id) ? id : null;
}

/** The video id of a YouTube link, else null. */
export function youtubeVideoId(input: string): string | null {
	const url = parsed(input);
	if (!url) return null;
	const id = url.hostname.endsWith("youtu.be")
		? url.pathname.slice(1).split("/")[0]
		: (url.searchParams.get("v") ??
			url.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/)?.[1]);
	return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

// ---- Titles ----

const NOISE =
	/\s*[([][^)\]]*(official|clip|video|vidéo|audio|lyrics?|paroles|visuali[sz]er|hd|hq|4k|remaster(ed)?|live|explicit|music)[^)\]]*[)\]]/gi;

/**
 * "Artist - Title (Official Video)" → { artist, title }. Without a dash, the
 * channel is the artist (its " - Topic" / "VEVO" suffix removed).
 */
export function splitTitle(
	raw: string,
	channel: string
): { artist: string; title: string } {
	let text = raw.replace(NOISE, "").replace(/\s+/g, " ").trim();
	const dash = text.match(/^(.+?)\s+[-–—]\s+(.+)$/);
	if (dash) return { artist: dash[1]!.trim(), title: dash[2]!.trim() };
	const artist = channel
		.replace(/\s*-\s*Topic$/i, "")
		.replace(/VEVO$/i, "")
		.replace(/\s*(Official|Music|Officiel)$/i, "")
		.trim();
	text = text.replace(/^["“](.+)["”]$/, "$1");
	return { artist, title: text };
}

function track(
	videoId: string,
	rawTitle: string,
	channel: string,
	seconds: number
): RawTrack {
	const { artist, title } = splitTitle(rawTitle, channel);
	return {
		type: "song",
		title,
		artist: { name: artist, url: "" },
		duration: seconds,
		url: `https://www.youtube.com/watch?v=${videoId}`
	};
}

// ---- Page data ----

/** The `ytInitialData` JSON of a YouTube page, else null. */
export function initialData(html: string): unknown {
	const m =
		html.match(/var ytInitialData = (\{.+?\});<\/script>/s) ??
		html.match(/window\["ytInitialData"\] = (\{.+?\});\s*\n/s);
	if (!m) return null;
	try {
		return JSON.parse(m[1]!);
	} catch {
		return null;
	}
}

type Json = Record<string, unknown>;
const at = (v: unknown, ...keys: (string | number)[]): unknown =>
	keys.reduce<unknown>(
		(o, k) => (o && typeof o === "object" ? (o as Json)[k] : undefined),
		v
	);
const text = (v: unknown): string => {
	if (typeof v === "string") return v;
	const s = at(v, "simpleText") ?? at(v, "content");
	if (typeof s === "string") return s;
	const runs = at(v, "runs");
	return Array.isArray(runs)
		? runs.map((r) => (typeof r?.text === "string" ? r.text : "")).join("")
		: "";
};

function walk(v: unknown, visit: (key: string, value: Json) => void): void {
	if (Array.isArray(v)) return v.forEach((x) => walk(x, visit));
	if (!v || typeof v !== "object") return;
	for (const [k, x] of Object.entries(v as Json)) {
		if (x && typeof x === "object" && !Array.isArray(x))
			visit(k, x as Json);
		walk(x, visit);
	}
}

/** The videos of a playlist page or of a watch page's playlist panel. */
export function playlistTracks(data: unknown): RawTrack[] {
	const out: RawTrack[] = [];
	const seen = new Set<string>();
	const push = (
		id: unknown,
		title: string,
		channel: string,
		secs: number
	) => {
		if (typeof id !== "string" || !title || seen.has(id)) return;
		seen.add(id);
		out.push(track(id, title, channel, secs));
	};
	walk(data, (key, v) => {
		// New layout (2025-): a "lockup" per video.
		if (
			key === "lockupViewModel" &&
			v.contentType === "LOCKUP_CONTENT_TYPE_VIDEO"
		) {
			const meta = at(v, "metadata", "lockupMetadataViewModel");
			const rows = at(
				meta,
				"metadata",
				"contentMetadataViewModel",
				"metadataRows"
			);
			const channel = text(at(rows, 0, "metadataParts", 0, "text"));
			let badge = "";
			walk(v.contentImage, (k, b) => {
				if (!badge && k === "thumbnailBadgeViewModel")
					badge = text(b.text);
			});
			push(
				v.contentId,
				text(at(meta, "title")),
				channel,
				clockToSeconds(badge)
			);
		}
		// Older layout, and the watch page's panel (mixes).
		if (key === "playlistVideoRenderer" && v.isPlayable !== false) {
			push(
				v.videoId,
				text(v.title),
				text(v.shortBylineText),
				Number(v.lengthSeconds) || clockToSeconds(text(v.lengthText))
			);
		}
		if (key === "playlistPanelVideoRenderer") {
			push(
				v.videoId,
				text(v.title),
				text(v.shortBylineText),
				clockToSeconds(text(v.lengthText))
			);
		}
	});
	return out;
}

function playlistTitle(data: unknown): string {
	return (
		text(at(data, "metadata", "playlistMetadataRenderer", "title")) ||
		text(
			at(
				data,
				"contents",
				"twoColumnWatchNextResults",
				"playlist",
				"playlist",
				"title"
			)
		) ||
		"YouTube Playlist"
	);
}

/** A YouTube playlist (or mix), else null. */
export async function youtubePlaylist(
	input: string
): Promise<RawPlaylist | null> {
	const list = youtubeListId(input);
	if (!list) return null;
	const options = { headers: HEADERS, timeoutMs: TIMEOUT_MS };
	let data: unknown = null;
	let tracks: RawTrack[] = [];
	// A mix (RD…) has no playlist page.
	if (!list.startsWith("RD")) {
		data = initialData(
			await fetchText(
				`https://www.youtube.com/playlist?list=${list}&hl=en`,
				options
			)
		);
		tracks = playlistTracks(data);
	}
	const video = youtubeVideoId(input);
	if (!tracks.length && video) {
		data = initialData(
			await fetchText(
				`https://www.youtube.com/watch?v=${video}&list=${list}&hl=en`,
				options
			)
		);
		tracks = playlistTracks(data);
	}
	if (!tracks.length) return null;
	return {
		type: "playlist",
		title: playlistTitle(data),
		description: "",
		numTracks: tracks.length,
		tracks
	};
}

/** A single YouTube video (oEmbed: title and channel), else null. */
export async function youtubeVideo(input: string): Promise<RawTrack | null> {
	const id = youtubeVideoId(input);
	if (!id) return null;
	const res = await fetchJson<{ title?: string; author_name?: string }>(
		`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
		{ timeoutMs: TIMEOUT_MS }
	);
	return res?.title ? track(id, res.title, res.author_name ?? "", 0) : null;
}
