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
 * Native Spotify metadata extractor (embedding of the kisastractors
 * spotify-metadata module). Scrapes the entity data that the
 * open.spotify.com embed page ships inside base64 `resource`,
 * `initial-state` or `__NEXT_DATA__` script blocks.
 *
 * No dependency: the `spotify-uri` and `himalaya` npm packages the
 * upstream module relied on are handled by ./uri.ts and
 * ../common/parse.ts (extractScriptTags).
 */

import { Buffer } from "node:buffer";
import { extractScriptTags } from "../common/parse.js";
import { formatSpotifyEmbedUrl, formatSpotifyOpenUrl } from "./uri.js";

export type SpotifyType = "album" | "artist" | "episode" | "playlist" | "track";

export interface SpotifyImage {
	url: string;
	width?: number;
	height?: number;
}

export interface SpotifyArtist {
	name: string;
}

export interface SpotifyShow {
	publisher: string;
}

export interface SpotifyTrackData {
	title: string;
	subtitle?: string;
	duration?: number;
	isPlayable?: boolean;
	audioPreview?: {
		url: string;
	};
	uri: string;
	artists?: SpotifyArtist[];
	show?: SpotifyShow;
	description?: string;
}

export interface SpotifyEntityData {
	type: string;
	name: string;
	uri: string;
	subtitle?: string;
	description?: string;
	releaseDate?: {
		isoString?: string;
	};
	release_date?: string;
	coverArt?: {
		sources: SpotifyImage[];
	};
	images?: SpotifyImage[];
	visualIdentity?: {
		image: SpotifyImage[];
	};
	trackList?: SpotifyTrackData[];
	[key: string]: unknown;
}

export interface Track {
	artist: string | string[] | undefined;
	duration: number | undefined;
	name: string;
	previewUrl: string | undefined;
	uri: string;
}

export interface Preview {
	date: string | undefined;
	title: string;
	type: string;
	track: string;
	description: string | undefined;
	artist: string | string[] | undefined;
	image: string | undefined;
	audio: string | undefined;
	link: string;
	embed: string;
}

export interface Details {
	preview: Preview;
	tracks: Track[];
}

const TYPE: Record<string, SpotifyType> = {
	ALBUM: "album",
	ARTIST: "artist",
	EPISODE: "episode",
	PLAYLIST: "playlist",
	TRACK: "track"
};

const SUPPORTED_TYPES: SpotifyType[] = Object.values(TYPE);

function getImages(data: SpotifyEntityData): SpotifyImage[] | undefined {
	return data.coverArt?.sources || data.images || data.visualIdentity?.image;
}

function getDate(data: SpotifyEntityData): string | undefined {
	return data.releaseDate?.isoString || data.release_date;
}

function getArtistTrack(track: SpotifyTrackData): string | string[] {
	if (track.show) {
		return track.show.publisher;
	}

	const names: string[] = (track.artists ?? [])
		.filter(Boolean)
		.map((artist) => artist.name);

	if (!names.length) {
		return "";
	}

	return names.reduce(
		(acc: string, name: string, index: number, array: string[]) =>
			index === 0
				? name
				: acc + (array.length - 1 === index ? " & " : ", ") + name,
		""
	);
}

function toTrack(track: SpotifyTrackData): Track {
	return {
		artist: getArtistTrack(track) || track.subtitle,
		duration: track.duration,
		name: track.title,
		previewUrl: track.isPlayable ? track.audioPreview?.url : undefined,
		uri: track.uri
	};
}

function getTracks(data: SpotifyEntityData): Track[] {
	return data.trackList
		? data.trackList.map(toTrack)
		: [toTrack(data as unknown as SpotifyTrackData)];
}

export function getLink(data: SpotifyEntityData): string {
	const link = formatSpotifyOpenUrl(data.uri);
	return link ?? data.uri;
}

function getPreview(data: SpotifyEntityData): Preview {
	const [track] = getTracks(data);
	const date = getDate(data);

	return {
		date: date ? new Date(date).toISOString() : date,
		title: data.name,
		type: data.type,
		track: track.name,
		description:
			data.description ||
			data.subtitle ||
			(track as unknown as SpotifyTrackData).description,
		artist: track.artist,
		image: getImages(data)?.reduce((a, b) =>
			(a.width ?? 0) > (b.width ?? 0) ? a : b
		)?.url,
		audio: track.previewUrl,
		link: getLink(data),
		embed: `https://embed.spotify.com/?uri=${data.uri}`
	};
}

type ScriptSelector = (script: {
	attributes: Record<string, string>;
	content: string;
}) => boolean | undefined;

const SCRIPT_SELECTORS: {
	matches: ScriptSelector;
	decode: (content: string) => SpotifyEntityData;
}[] = [
	{
		// `<script id="resource">`: base64 encoded entity JSON.
		matches: (script) =>
			Object.values(script.attributes).some(
				(value) => value === "resource"
			),
		decode: (content) =>
			JSON.parse(Buffer.from(content, "base64").toString("utf-8"))
	},
	{
		// `<script id="initial-state">`: base64 encoded `{ data: { entity } }`.
		matches: (script) =>
			Object.values(script.attributes).some(
				(value) => value === "initial-state"
			),
		decode: (content) => {
			const parsed = JSON.parse(
				Buffer.from(content, "base64").toString("utf-8")
			);

			const entity = parsed?.data?.entity as
				SpotifyEntityData | undefined;

			if (!entity) {
				throw new TypeError("no entity in initial-state script");
			}

			return entity;
		}
	},
	{
		// `<script id="__NEXT_DATA__">`: plain JSON `{ props: ... entity }`.
		matches: (script) =>
			(script.attributes["id"] ?? "").includes("__NEXT_DATA__"),
		decode: (content) => {
			const parsed = JSON.parse(content);

			const entity = parsed?.props?.pageProps?.state?.data?.entity as
				SpotifyEntityData | undefined;

			if (!entity) {
				throw new TypeError("no entity in __NEXT_DATA__ script");
			}

			return entity;
		}
	}
];

export function parseData(html: string): SpotifyEntityData {
	const scripts = extractScriptTags(html);

	let data: SpotifyEntityData | undefined;

	for (const selector of SCRIPT_SELECTORS) {
		const script = scripts.find((item) => selector.matches(item));

		if (!script) {
			continue;
		}

		try {
			data = selector.decode(script.content);

			if (data) {
				break;
			}
		} catch (err) {
			logger.debug(
				"spotify-metadata:",
				err instanceof Error ? err.message : String(err)
			);
		}
	}

	if (!data) {
		throw new Error(
			"Couldn't find any data in embed page that we know how to parse."
		);
	}

	return normalizeData({
		data
	});
}

function normalizeData({
	data
}: {
	data: SpotifyEntityData;
}): SpotifyEntityData {
	if (!data || !data.type || !data.name) {
		throw new Error("Data doesn't seem to be of the right shape to parse");
	}

	if (!SUPPORTED_TYPES.includes(data.type as SpotifyType)) {
		throw new Error(
			`Not an ${SUPPORTED_TYPES.join(", ")}. Only these types can be parsed`
		);
	}

	const uriType = data.uri.split(":")[1];
	data.type = typeof uriType === "string" ? uriType : data.type;

	return data;
}

/**
 * Fetches the embed page for any spotify link and returns the raw
 * entity payload that page ships.
 */
export async function getData(url: string): Promise<SpotifyEntityData> {
	const embedUrl = formatSpotifyEmbedUrl(url);

	if (!embedUrl) {
		throw new Error(`Couldn't parse '${url}' as a valid Spotify link`);
	}

	const response = await fetch(embedUrl);

	return parseData(await response.text());
}

/**
 * Same as getData, but returns only the tracks list.
 */
export async function getTracksFromUrl(url: string): Promise<Track[]> {
	const data = await getData(url);
	return getTracks(data);
}

/**
 * Same as getData, but returns only the embed preview.
 */
export async function getPreviewFromUrl(url: string): Promise<Preview> {
	const data = await getData(url);
	return getPreview(data);
}

/**
 * Same as getData, but returns both tracks and preview.
 */
export async function getDetails(url: string): Promise<Details> {
	const data = await getData(url);
	return {
		preview: getPreview(data),
		tracks: getTracks(data)
	};
}

export { getTracksFromUrl as getTracks, getPreviewFromUrl as getPreview };
