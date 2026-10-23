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
 * Native TIDAL metadata extractor (embedding of the kisastractors
 * tidal-metadata module). Scrapes the embed.tidal.com pages which are
 * fully server-rendered web components.
 */

import type {
	Artist,
	MetadataResult,
	RawAlbum,
	RawPlaylist,
	RawTrack
} from "../common/types.js";
import { fetchText } from "../common/http.js";
import {
	clockToSeconds,
	decodeHtmlEntities,
	stripHtmlTags
} from "../common/parse.js";

const DEFAULT_HEADERS = {
	accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

function extractAlbumId(input: string): string {
	// Pure numeric ID
	if (/^\d+$/.test(input)) {
		return input;
	}

	// URL: tidal.com/album/{id} or tidal.com/album/{id}/u
	const match = input.match(/\/album\/(\d+)/);

	if (!match) {
		throw new Error("Could not find album ID in TIDAL link");
	}

	return match[1];
}

function extractTrackId(input: string): string {
	if (/^\d+$/.test(input)) {
		return input;
	}

	const match = input.match(/\/track\/(\d+)/);

	if (!match) {
		throw new Error("Could not find track ID in TIDAL link");
	}

	return match[1];
}

function extractPlaylistId(input: string): string {
	// UUID format
	if (
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			input
		)
	) {
		return input;
	}

	const match = input.match(
		/\/playlist\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
	);

	if (!match) {
		throw new Error("Could not find playlist ID in TIDAL link");
	}

	return match[1];
}

function detectType(input: string): "track" | "album" | "playlist" | "unknown" {
	if (/\/track\/\d+/i.test(input)) {
		return "track";
	}
	if (/\/album\/\d+/i.test(input)) {
		return "album";
	}
	if (/\/playlist\/[0-9a-f-]+/i.test(input)) {
		return "playlist";
	}
	// numeric IDs are ambiguous, default to album
	if (/^\d+$/.test(input)) {
		return "album";
	}
	return "unknown";
}

function parseArtists(html: string): Artist[] {
	const artists: Artist[] = [];

	// Look for media-artist span containing <a> tags
	const artistRegex =
		/<a\s+href="(https:\/\/tidal\.com\/artist\/\d+)"[^>]*>([^<]+)<\/a>/g;
	let match;

	while ((match = artistRegex.exec(html)) !== null) {
		const url = match[1] ?? "";
		const name = (match[2] ?? "").trim();

		if (name && !artists.some((artist) => artist.url === url)) {
			artists.push({ name, url });
		}
	}

	return artists;
}

async function fetchEmbed(type: string, id: string): Promise<string> {
	const url = `https://embed.tidal.com/${type}s/${id}`;

	const html = await fetchText(url, { headers: DEFAULT_HEADERS });

	logger.debug("tidal metadata: fetched", url);

	return html;
}

function parseAlbumEmbed(html: string, albumId: string): RawAlbum {
	// Extract album title from <h1 class="media-album">
	const titleMatch = html.match(
		/<h1\s+class="media-album"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i
	);
	const title = decodeHtmlEntities(titleMatch?.[1]?.trim() ?? "");

	// Extract artist
	const artistSection = html.match(
		/<span\s+class="media-artist"[^>]*>([\s\S]*?)<\/span>/i
	);
	const artistHtml = artistSection?.[1] ?? html;
	const artists = parseArtists(artistHtml);
	const artist: Artist = artists[0] ?? { name: "", url: "" };

	// Extract tracks from <list-item> elements
	const tracks: RawTrack[] = [];

	const listItemRegex =
		/<list-item[^>]*product-id="(\d+)"[^>]*>([\s\S]*?)<\/list-item>/gi;
	let itemMatch;

	while ((itemMatch = listItemRegex.exec(html)) !== null) {
		const trackId = itemMatch[1] ?? "";
		const itemHtml = itemMatch[2] ?? "";

		const trackTitleMatch = itemHtml.match(/slot="title"[^>]*>([^<]+)<\//i);
		const title = decodeHtmlEntities(trackTitleMatch?.[1]?.trim() ?? "");

		const durationMatch = itemHtml.match(
			/slot="duration"[^>]*>([^<]+)<\//i
		);
		const duration = clockToSeconds(durationMatch?.[1]);

		// Track-level artist (featured artist)
		const trackArtistMatch = itemHtml.match(
			/slot="artist"[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/i
		);
		const trackArtist: Artist = trackArtistMatch
			? {
					name: trackArtistMatch[2]?.trim() ?? artist.name,
					url: trackArtistMatch[1]?.trim() ?? artist.url
				}
			: { ...artist };

		tracks.push({
			artist: trackArtist,
			duration,
			title,
			url: `https://tidal.com/track/${trackId}`,
			type: "song"
		});
	}

	return {
		title,
		description: "", // embed doesn't provide description for albums
		artist,
		tracks,
		numTracks: tracks.length,
		type: "album"
	};
}

function parseTrackEmbed(html: string, trackId: string): RawTrack {
	// Extract track title from <h1 class="media-title">
	const titleMatch = html.match(
		/<h1\s+class="media-title"[^>]*>([^<]+)<\/h1>/i
	);
	const title = decodeHtmlEntities(titleMatch?.[1]?.trim() ?? "");

	// Extract artist(s)
	const artistSection = html.match(
		/<span\s+class="media-artist"[^>]*>([\s\S]*?)<\/span>/i
	);
	const artistHtml = artistSection?.[1] ?? html;
	const artists = parseArtists(artistHtml);
	const artist: Artist = artists[0] ?? { name: "", url: "" };

	// Extract duration (in seconds from <tidal-duration-time>)
	const durationMatch = html.match(
		/<tidal-duration-time>(\d+)<\/tidal-duration-time>/i
	);
	const duration = durationMatch?.[1] ? parseInt(durationMatch[1], 10) : 0;

	return {
		artist,
		duration,
		title,
		url: `https://tidal.com/track/${trackId}`,
		type: "song"
	};
}

function parsePlaylistEmbed(html: string): RawPlaylist {
	// Extract playlist title from <h1 class="media-album">
	const titleMatch = html.match(
		/<h1\s+class="media-album"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i
	);
	const title = decodeHtmlEntities(titleMatch?.[1]?.trim() ?? "");

	// Extract creator (displayed as "artist" in embed)
	const creatorSection = html.match(
		/<span\s+class="media-artist"[^>]*>([\s\S]*?)<\/span>/i
	);
	const creatorHtml = creatorSection?.[1] ?? "";

	// Extract tracks from <list-item> elements
	const tracks: RawTrack[] = [];

	const listItemRegex =
		/<list-item[^>]*product-id="(\d+)"[^>]*>([\s\S]*?)<\/list-item>/gi;
	let itemMatch;

	while ((itemMatch = listItemRegex.exec(html)) !== null) {
		const trackId = itemMatch[1] ?? "";
		const itemHtml = itemMatch[2] ?? "";

		const trackTitleMatch = itemHtml.match(/slot="title"[^>]*>([^<]+)<\//i);
		const title = decodeHtmlEntities(trackTitleMatch?.[1]?.trim() ?? "");

		const durationMatch = itemHtml.match(
			/slot="duration"[^>]*>([^<]+)<\//i
		);
		const duration = clockToSeconds(durationMatch?.[1]);

		// Track artist
		const trackArtistMatch = itemHtml.match(
			/slot="artist"[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/i
		);
		const trackArtist: Artist = trackArtistMatch
			? {
					name: trackArtistMatch[2]?.trim() ?? "",
					url: trackArtistMatch[1]?.trim() ?? ""
				}
			: { name: "", url: "" };

		tracks.push({
			artist: trackArtist,
			duration,
			title,
			url: `https://tidal.com/track/${trackId}`,
			type: "song"
		});
	}

	return {
		title,
		description: `Playlist by ${
			stripHtmlTags(creatorHtml).trim() || "TIDAL"
		}`,
		tracks,
		numTracks: tracks.length,
		type: "playlist"
	};
}

/**
 * Fetches a TIDAL album (by numeric id, URL or bare id).
 */
export async function album(input: string): Promise<RawAlbum> {
	const id = extractAlbumId(input);

	logger.debug("tidal metadata: album", id);

	const html = await fetchEmbed("album", id);
	return parseAlbumEmbed(html, id);
}

/**
 * Fetches a single TIDAL track (by numeric id, URL or bare id).
 */
export async function track(input: string): Promise<RawTrack> {
	const id = extractTrackId(input);

	logger.debug("tidal metadata: track", id);

	const html = await fetchEmbed("track", id);
	return parseTrackEmbed(html, id);
}

/**
 * Fetches a TIDAL playlist (by UUID, URL or bare UUID).
 */
export async function playlist(input: string): Promise<RawPlaylist> {
	const id = extractPlaylistId(input);

	logger.debug("tidal metadata: playlist", id);

	const html = await fetchEmbed("playlist", id);
	return parsePlaylistEmbed(html);
}

/**
 * Auto-detects the kind of TIDAL link and resolves it.
 * Unknown inputs are tried as album first (numeric IDs), then playlist.
 */
export async function search(input: string): Promise<MetadataResult> {
	const type = detectType(input);

	if (type === "track") {
		return await track(input);
	}

	if (type === "album") {
		return await album(input);
	}

	if (type === "playlist") {
		return await playlist(input);
	}

	try {
		return await album(input);
	} catch {
		return await playlist(input);
	}
}

export default search;
