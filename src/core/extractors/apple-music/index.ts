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
 * Native Apple Music metadata extractor (embedding of the kisastractors
 * apple-music-metadata module).
 *
 * Every Apple Music page (song / album / playlist) embeds a
 * `<script type="application/ld+json">` block (schema.org) holding the
 * full structured metadata, including the complete tracklist. It is a
 * lot more reliable than scraping the visible DOM, which is hydrated
 * client-side by a JS app.
 */

import type { Artist, MetadataResult } from "../common/types.js";
import { fetchText } from "../common/http.js";
import { isoDurationToSeconds } from "../common/parse.js";

export interface Track {
	artist: Artist;
	duration: number;
	title: string;
	url: string;
	type: "song";
}

export interface RawAlbum {
	artist: Artist;
	description: string;
	numTracks: number;
	title: string;
	tracks: Track[];
	type: "album";
}

export interface RawPlaylist {
	creator: Artist;
	description: string;
	numTracks: number;
	title: string;
	tracks: Track[];
	type: "playlist";
}

export type AppleMusicResult = MetadataResult;

/**
 * Collects every JSON-LD script block of the page with the Bun native
 * HTMLRewriter (streaming, no third-party parser).
 */
async function extractJsonLdBlocks(html: string): Promise<any[]> {
	const blocks: string[] = [];
	let current = -1;

	await new HTMLRewriter()
		.on('script[type="application/ld+json"]', {
			element() {
				blocks.push("");
				current = blocks.length - 1;
			},
			text(textChunk) {
				if (current >= 0) {
					blocks[current] += textChunk.text;
				}
			}
		})
		.transform(new Response(html))
		.text();

	const parsed: any[] = [];

	for (const block of blocks) {
		try {
			parsed.push(JSON.parse(block));
		} catch {
			// malformed or empty JSON-LD block, ignore it
		}
	}

	return parsed;
}

function getRawAlbum(blocks: any[]): RawAlbum {
	const data = blocks.find(
		(block) => block && block["@type"] === "MusicAlbum"
	);

	if (!data) {
		throw new Error("Could not find MusicAlbum JSON-LD data on the page");
	}

	const artist: Artist = {
		name: data.byArtist?.[0]?.name ?? "",
		url: data.byArtist?.[0]?.url ?? ""
	};

	const tracks: Track[] = (data.tracks ?? [])
		.filter(
			(track: any) => track["@type"] === "MusicRecording" && track.audio
		)
		.map((track: any) => ({
			artist,
			title: track.name ?? "",
			duration: isoDurationToSeconds(track.duration ?? "PT0S"),
			url: track.url ?? "",
			type: "song" as const
		}));

	return {
		title: data.name ?? "",
		description: data.description ?? "",
		artist,
		tracks,
		numTracks: tracks.length,
		type: "album"
	};
}

function getRawPlaylist(blocks: any[]): RawPlaylist {
	const data = blocks.find(
		(block) => block && block["@type"] === "MusicPlaylist"
	);

	if (!data) {
		throw new Error(
			"Could not find MusicPlaylist JSON-LD data on the page"
		);
	}

	const creator: Artist = {
		name: data.author?.name ?? data.creator?.name ?? "",
		url: data.author?.url ?? data.creator?.url ?? ""
	};

	const rawTracks: any[] = data.tracks ?? data.track ?? [];

	const tracks: Track[] = rawTracks
		.filter(
			(track: any) => track["@type"] === "MusicRecording" && track.audio
		)
		.map((track: any) => ({
			artist: {
				name: track.byArtist?.[0]?.name ?? creator.name,
				url: track.byArtist?.[0]?.url ?? creator.url
			},
			title: track.name ?? "",
			duration: isoDurationToSeconds(track.duration ?? "PT0S"),
			url: track.url ?? "",
			type: "song" as const
		}));

	return {
		title: data.name ?? "",
		description: data.description ?? "",
		creator,
		tracks,
		numTracks: tracks.length,
		type: "playlist"
	};
}

async function extractAlbumUrlFromSongPage(
	html: string
): Promise<string | undefined> {
	let albumUrl: string | undefined;

	await new HTMLRewriter()
		.on("meta[property='music:album']", {
			element(element) {
				albumUrl = element.getAttribute("content") ?? undefined;
			}
		})
		.transform(new Response(html))
		.text();

	return albumUrl;
}

function isDirectSongUrl(url: string): boolean {
	return /https?:\/\/music\.apple\.com\/.+?\/song\/.+?\/([0-9]+)/.test(url);
}

function linkType(url: string): "song" | "album" | "playlist" {
	if (
		/https?:\/\/music\.apple\.com\/.+?\/album\/.+?\/.+?\?i=([0-9]+)/.test(
			url
		)
	) {
		return "song";
	}

	if (/https?:\/\/music\.apple\.com\/.+?\/song\/.+?\/([0-9]+)/.test(url)) {
		return "song";
	}

	if (/https?:\/\/music\.apple\.com\/.+?\/playlist\//.test(url)) {
		return "playlist";
	}

	if (/https?:\/\/music\.apple\.com\/.+?\/album\//.test(url)) {
		return "album";
	}

	throw new Error("Apple Music link is invalid");
}

/**
 * Apple started serving a `MusicComposition` JSON-LD (the song itself)
 * on song URLs, instead of the `MusicAlbum` block they used to ship.
 * That is enough to resolve the track in a single request.
 */
function getRawSongFromComposition(blocks: any[]): Track | undefined {
	const data = blocks.find(
		(block) => block && block["@type"] === "MusicComposition"
	);

	if (!data) {
		return undefined;
	}

	return {
		artist: {
			name: data.byArtist?.[0]?.name ?? "",
			url: data.byArtist?.[0]?.url ?? ""
		},
		title: data.name ?? "",
		duration: isoDurationToSeconds(data.duration ?? "PT0S"),
		url: data.url ?? "",
		type: "song" as const
	};
}

function songUrlId(url: string): string | undefined {
	const match = /\/song\/.+?\/([0-9]+)/.exec(url);
	return match ? match[1] : undefined;
}

function extractSongId(url: string): string | undefined {
	const albumMatch =
		/https?:\/\/music\.apple\.com\/.+?\/album\/.+?\/.+?\?i=([0-9]+)/.exec(
			url
		);

	if (albumMatch) {
		return albumMatch[1];
	}

	const songMatch =
		/https?:\/\/music\.apple\.com\/.+?\/song\/.+?\/([0-9]+)/.exec(url);

	if (songMatch) {
		return songMatch[1];
	}

	return undefined;
}

async function fetchApplePage(url: string): Promise<string | undefined> {
	try {
		return await fetchText(url, {
			headers: {
				accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
			}
		});
	} catch {
		return undefined;
	}
}

/**
 * Resolves an Apple Music link into a song, an album or a playlist.
 * Returns `null` when the page cannot be fetched or parsed.
 */
async function search(url: string): Promise<AppleMusicResult | null> {
	const urlType = linkType(url);

	const page = await fetchApplePage(url);

	if (!page) {
		logger.debug("apple music metadata: http request failed");
		return null;
	}

	if (urlType === "playlist") {
		return getRawPlaylist(await extractJsonLdBlocks(page));
	}

	if (urlType === "song" && isDirectSongUrl(url)) {
		const albumUrl = await extractAlbumUrlFromSongPage(page);

		if (!albumUrl) {
			logger.debug(
				"apple music metadata: failed to resolve song page to album url"
			);
			return null;
		}

		// Always fetch the clean album URL (without `?i=`): the `?i=` variant
		// replayed from the meta tag serves inconsistent content depending on
		// Apple's cache / edge.
		const cleanAlbumUrl = albumUrl.split("?")[0];
		const albumPage = await fetchApplePage(cleanAlbumUrl || "");

		if (!albumPage) {
			logger.debug("apple music metadata: http request failed (album)");
			return null;
		}

		const album = getRawAlbum(await extractJsonLdBlocks(albumPage));

		const id = songUrlId(url);

		if (!id) {
			logger.debug("apple music metadata: failed to extract song id");
			return null;
		}

		const track = album.tracks.find(
			(trackItem) => songUrlId(trackItem.url) === id
		);

		if (!track) {
			logger.debug("apple music metadata: track not found in album");
			return null;
		}

		return track;
	}

	const blocks = await extractJsonLdBlocks(page);

	if (urlType === "song") {
		// `?i=` album links resolve straight from the MusicComposition block.
		const track = getRawSongFromComposition(blocks);
		return track ?? null;
	}

	const album = getRawAlbum(blocks);

	if (urlType === "album") {
		return album;
	}

	const id = extractSongId(url);

	if (!id) {
		logger.debug("apple music metadata: failed to extract song id");
		return null;
	}

	const track = album.tracks.find(
		(trackItem) => songUrlId(trackItem.url) === id
	);

	if (!track) {
		logger.debug("apple music metadata: track not found in album");
		return null;
	}

	return track;
}

export default search;
