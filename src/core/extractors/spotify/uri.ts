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
 * Minimal native Spotify link / URI parsing, replacing the `spotify-uri`
 * npm dependency. Supports the shapes a user can actually paste:
 *
 *    spotify:track:ID
 *    spotify:playlist:ID
 *    https://open.spotify.com/track/ID
 *    https://open.spotify.com/playlist/ID?si=...
 *    https://open.spotify.com/embed/track/ID
 *    https://open.spotify.com/intl-de/album/ID
 */

export type SpotifyEntityType =
	"album" | "artist" | "episode" | "playlist" | "show" | "track";

export interface ParsedSpotifyLink {
	type: SpotifyEntityType;
	id: string;
}

const ENTITY_TYPES: SpotifyEntityType[] = [
	"album",
	"artist",
	"episode",
	"playlist",
	"show",
	"track"
];

const TYPE_PATTERN = "(album|artist|episode|playlist|show|track)";

const URI_PATTERN = new RegExp(
	`^spotify:(?:user:[^:]+:)?${TYPE_PATTERN}:([A-Za-z0-9]+)$`
);

const URL_PATTERN = new RegExp(
	`open\\.spotify\\.com(?:/embed)?(?:/intl-[a-z-]+)?(?:/user/[^/]+)?/${TYPE_PATTERN}/([A-Za-z0-9]+)`
);

/**
 * Parses a Spotify URI or open.spotify.com link into its entity type/id.
 */
export function parseSpotifyLink(input: string): ParsedSpotifyLink | undefined {
	const input2 = input.trim();

	const uriMatch = URI_PATTERN.exec(input2);

	if (uriMatch) {
		return {
			type: uriMatch[1] as SpotifyEntityType,
			id: uriMatch[2]
		};
	}

	const urlMatch = URL_PATTERN.exec(input2);

	if (urlMatch) {
		return {
			type: urlMatch[1] as SpotifyEntityType,
			id: urlMatch[2]
		};
	}

	// Bare base-62 id: try every entity type, Spotify redirects unknown ids.
	if (/^[A-Za-z0-9]{22}$/.test(input2)) {
		return {
			type: "track",
			id: input2
		};
	}

	return undefined;
}

/**
 * Returns the canonical open.spotify.com link for a parsed entity,
 * or `undefined` when the link cannot be parsed.
 */
export function formatSpotifyOpenUrl(input: string): string | undefined {
	const parsed = parseSpotifyLink(input);

	if (!parsed) {
		return undefined;
	}

	return `https://open.spotify.com/${parsed.type}/${parsed.id}`;
}

/**
 * Returns the embed URL used to scrape entity data, or `undefined`
 * when the link cannot be parsed.
 */
export function formatSpotifyEmbedUrl(input: string): string | undefined {
	const parsed = parseSpotifyLink(input);

	if (!parsed) {
		return undefined;
	}

	return `https://open.spotify.com/embed/${parsed.type}/${parsed.id}`;
}
