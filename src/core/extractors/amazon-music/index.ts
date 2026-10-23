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
 * Native Amazon Music metadata extractor (embedding of the kisastractors
 * amazon-music-metadata module). Talks to the web player "skill" catalog
 * API (na/eu/fe.web.skill.music.a2z.com), seeded by the per-domain
 * `config.json` session tokens.
 */

import type {
	Artist,
	MetadataResult,
	RawAlbum,
	RawPlaylist,
	RawTrack
} from "../common/types.js";
import { clockToSeconds } from "../common/parse.js";

export interface AmazonRegionConfig {
	skillEndpoint: string;
	language: string;
	currency: string;
}

const SKILL_ENDPOINTS = {
	NA: "https://na.web.skill.music.a2z.com",
	EU: "https://eu.web.skill.music.a2z.com",
	FE: "https://fe.web.skill.music.a2z.com"
} as const;

const REGION_CONFIG_MAP: Record<string, AmazonRegionConfig> = {
	"music.amazon.com": {
		skillEndpoint: SKILL_ENDPOINTS.NA,
		language: "en_US",
		currency: "USD"
	},

	"music.amazon.fr": {
		skillEndpoint: SKILL_ENDPOINTS.EU,
		language: "fr_FR",
		currency: "EUR"
	},

	"music.amazon.de": {
		skillEndpoint: SKILL_ENDPOINTS.EU,
		language: "de_DE",
		currency: "EUR"
	},

	"music.amazon.co.uk": {
		skillEndpoint: SKILL_ENDPOINTS.EU,
		language: "en_GB",
		currency: "GBP"
	},

	"music.amazon.co.jp": {
		skillEndpoint: SKILL_ENDPOINTS.FE,
		language: "ja_JP",
		currency: "JPY"
	}
};

const DEFAULT_DOMAIN = "music.amazon.fr";

interface AmazonDomainConfig {
	accessToken?: string;
	deviceId?: string;
	sessionId?: string;
	version?: string;
	csrf?: {
		token?: string;
		ts?: string | number;
		rnd?: string | number;
	};
}

/**
 * Unwraps `methods[0].template` of a skill API payload and rejects the
 * localized "service error" template the endpoint answers with when the
 * web player session is refused (empty headerText means no real data).
 */
function catalogTemplate(data: any): any {
	const template = data?.methods?.[0]?.template;

	if (!template || !template.headerText) {
		throw new Error(
			"Amazon Music catalog API returned a service error (web player session refused)"
		);
	}

	return template;
}

async function fetchDomainConfig(domain: string): Promise<any> {
	const res = await fetch(`https://${domain}/config.json`, {
		headers: {
			accept: "*/*",
			referer: `https://${domain}/`,
			"user-agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
		}
	});

	if (!res.ok) {
		throw new Error(`config.json HTTP ${res.status}`);
	}

	return await res.json();
}

function buildAmazonHeaders(
	config: AmazonDomainConfig,
	region: AmazonRegionConfig,
	domain: string,
	pageUrl: string
) {
	return {
		"x-amzn-authentication": JSON.stringify({
			interface: "ClientAuthenticationInterface.v1_0.ClientTokenElement",

			accessToken: config.accessToken ?? ""
		}),

		"x-amzn-device-model": "WEBPLAYER",
		"x-amzn-device-family": "WebPlayer",
		"x-amzn-device-id": config.deviceId ?? "",

		"x-amzn-session-id": config.sessionId ?? "",

		"x-amzn-device-width": "1920",
		"x-amzn-device-height": "1080",

		"x-amzn-request-id": crypto.randomUUID(),

		"x-amzn-device-language": region.language,

		"x-amzn-currency-of-preference": region.currency,

		"x-amzn-os-version": "1.0",

		"x-amzn-application-version": config.version ?? "",

		"x-amzn-device-time-zone": "Europe/Paris",

		"x-amzn-timestamp": String(Date.now()),

		"x-amzn-csrf": JSON.stringify({
			interface: "CSRFInterface.v1_0.CSRFHeaderElement",

			token: config.csrf?.token ?? "",

			timestamp: config.csrf?.ts ? String(config.csrf.ts) : "",

			rndNonce: config.csrf?.rnd ? String(config.csrf.rnd) : ""
		}),

		"x-amzn-music-domain": domain,

		"x-amzn-referer": domain,

		"x-amzn-page-url": pageUrl,

		"x-amzn-feature-flags": "hd-supported,uhd-supported"
	};
}

async function fetchCatalog(
	endpoint: string,
	id: string,
	domain: string,
	pageUrl: string
) {
	const region = REGION_CONFIG_MAP[domain];

	if (!region) {
		throw new Error(`Unsupported Amazon Music domain: ${domain}`);
	}

	const config: AmazonDomainConfig = await fetchDomainConfig(domain);

	const headers = buildAmazonHeaders(config, region, domain, pageUrl);

	const res = await fetch(`${region.skillEndpoint}${endpoint}`, {
		method: "POST",

		headers: {
			accept: "*/*",
			"accept-language": "en-US,en;q=0.9",
			"content-type": "text/plain;charset=UTF-8",
			origin: `https://${domain}`,
			referer: `https://${domain}/`,
			"user-agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
		},

		body: JSON.stringify({
			id,

			userHash: JSON.stringify({
				level: "LIBRARY_MEMBER"
			}),

			headers: JSON.stringify(headers)
		})
	});

	if (!res.ok) {
		throw new Error(`${endpoint} HTTP ${res.status}`);
	}

	return await res.json();
}

export function extractAlbumId(input: string): string {
	if (/^[A-Z0-9]{10}$/i.test(input)) {
		return input;
	}

	const match = input.match(/\/albums\/([A-Z0-9]{10})/i);

	if (!match) {
		throw new Error("Could not find album ASIN");
	}

	return match[1];
}

export function extractPlaylistId(input: string): string {
	if (/^[A-Z0-9]{10}$/i.test(input)) {
		return input;
	}

	const match = input.match(/\/playlists\/([A-Z0-9]{10})/i);

	if (!match) {
		throw new Error("Could not find playlist ASIN");
	}

	return match[1];
}

export function extractTrackId(input: string): string {
	if (/^[A-Z0-9]{10}$/i.test(input)) {
		return input;
	}

	try {
		const url = new URL(input);

		const trackAsin = url.searchParams.get("trackAsin");

		if (trackAsin && /^[A-Z0-9]{10}$/i.test(trackAsin)) {
			return trackAsin;
		}
	} catch {}

	const match = input.match(/\/tracks\/([A-Z0-9]{10})/i);

	if (!match) {
		throw new Error("Could not find track ASIN");
	}

	return match[1];
}

export function detectType(
	input: string
): "track" | "album" | "playlist" | "unknown" {
	if (/\/tracks\/[A-Z0-9]{10}/i.test(input)) {
		return "track";
	}

	try {
		const url = new URL(input);

		if (url.searchParams.has("trackAsin")) {
			return "track";
		}

		if (url.pathname.includes("/albums/")) {
			return "album";
		}

		if (url.pathname.includes("/playlists/")) {
			return "playlist";
		}
	} catch {}

	return "unknown";
}

function toRawPlaylist(data: any): RawPlaylist {
	const playlist = catalogTemplate(data);

	const items =
		playlist.widgets?.flatMap((widget: any) => widget.items ?? []) ?? [];

	const tracks: RawTrack[] = items.map((item: any) => {
		const id = item.primaryTextLink?.deeplink?.split("/tracks/")[1] ?? "";

		return {
			artist: {
				name: item.secondaryText2 || item.secondaryText || "",
				url: item.secondaryText2Link?.deeplink
					? `https://music.amazon.com${item.secondaryText2Link.deeplink}`
					: ""
			},
			title: item.primaryText ?? "",
			duration: clockToSeconds(item.secondaryText3),
			url: id ? `https://music.amazon.com/tracks/${id}` : "",
			type: "song"
		};
	});

	return {
		title: playlist.headerText?.text ?? "",
		description: playlist.headerTertiaryText ?? "",
		tracks,
		numTracks: tracks.length,
		type: "playlist"
	};
}

function toRawTrack(data: any, id: string): RawTrack {
	const track = catalogTemplate(data);

	return {
		artist: {
			name: track.headerPrimaryText ?? "",

			url: track.headerPrimaryTextLink?.deeplink
				? `https://music.amazon.com${track.headerPrimaryTextLink.deeplink}`
				: ""
		},

		title: track.headerText?.text ?? "",

		duration: clockToSeconds(track.headerTertiaryText),

		url: `https://music.amazon.com/tracks/${id}`,

		type: "song"
	};
}

function toRawAlbum(data: any): RawAlbum {
	const album = catalogTemplate(data);

	const artist: Artist = {
		name: album.headerPrimaryText ?? "",

		url: album.headerPrimaryTextLink?.deeplink
			? `https://music.amazon.com${album.headerPrimaryTextLink.deeplink}`
			: ""
	};

	const items =
		album.widgets?.flatMap((widget: any) => widget.items ?? []) ?? [];

	const tracks: RawTrack[] = items.map((item: any) => {
		const id = item.primaryTextLink?.deeplink?.split("/tracks/")[1] ?? "";

		return {
			artist: {
				name: item.secondaryText2 || artist.name,
				url: item.secondaryText2Link?.deeplink
					? `https://music.amazon.com${item.secondaryText2Link.deeplink}`
					: artist.url
			},
			title: item.primaryText ?? "",
			duration: clockToSeconds(item.secondaryText3),
			url: id ? `https://music.amazon.com/tracks/${id}` : "",
			type: "song"
		};
	});

	return {
		title: album.headerText?.text ?? "",

		description: album.headerTertiaryText ?? "",

		artist,

		tracks,

		numTracks: tracks.length,

		type: "album"
	};
}

/**
 * Fetches a full Amazon Music catalog playlist (by id / URL / ASIN).
 */
export async function playlist(
	input: string,
	domain: string = DEFAULT_DOMAIN
): Promise<RawPlaylist> {
	const id = extractPlaylistId(input);

	logger.debug("amazon music metadata: playlist", id);

	const data = await fetchCatalog(
		"/api/showCatalogPlaylist",
		id,
		domain,
		`https://${domain}/playlists/${id}`
	);

	return toRawPlaylist(data);
}

/**
 * Fetches a single Amazon Music track (by id / URL / ASIN), resolved
 * from its parent catalog album.
 */
export async function track(
	input: string,
	domain: string = DEFAULT_DOMAIN
): Promise<RawTrack> {
	const trackId = extractTrackId(input);

	const albumId = extractAlbumId(input);

	const data = await fetchCatalog(
		"/api/showCatalogAlbum",
		albumId,
		domain,
		`https://${domain}/albums/${albumId}`
	);

	const album = toRawAlbum(data);

	const found = album.tracks.find((item) => item.url.endsWith(trackId));

	if (!found) {
		throw new Error(
			`Track ${trackId} could not be found in album ${albumId}`
		);
	}

	return found;
}

/**
 * Fetches a full Amazon Music catalog album (by id / URL / ASIN).
 */
export async function album(
	input: string,
	domain: string = DEFAULT_DOMAIN
): Promise<RawAlbum> {
	const id = extractAlbumId(input);

	logger.debug("amazon music metadata: album", id);

	const data = await fetchCatalog(
		"/api/showCatalogAlbum",
		id,
		domain,
		`https://${domain}/albums/${id}`
	);

	return toRawAlbum(data);
}

/**
 * Auto-detects the kind of Amazon Music link and resolves it.
 * Bare ASIN inputs are tried as track then album.
 */
export async function search(
	input: string,
	domain: string = DEFAULT_DOMAIN
): Promise<MetadataResult> {
	const type = detectType(input);

	if (type === "track") {
		return await track(input, domain);
	}

	if (type === "album") {
		return await album(input, domain);
	}

	if (type === "playlist") {
		return await playlist(input, domain);
	}

	try {
		return await track(input, domain);
	} catch {
		return await album(input, domain);
	}
}

export default search;
