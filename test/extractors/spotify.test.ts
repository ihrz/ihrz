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

import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
	getData,
	getTracks,
	parseData
} from "../../src/core/extractors/spotify/index.js";

// ---- parseData (fixtures, offline) ----

const mapValuesDeep = (
	value: unknown,
	callback: (value: unknown) => unknown
): unknown => {
	if (Array.isArray(value)) {
		return value.map((item) => mapValuesDeep(item, callback));
	}

	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>).map(
				([key, val]) => [key, mapValuesDeep(val, callback)]
			)
		);
	}

	return callback(value);
};

const toTypeof = (value: unknown) => typeof value;

const expected = mapValuesDeep(
	{
		type: "track",
		name: "Immaterial",
		uri: "spotify:track:5nTtCOCds6I0PHMNtqelas",
		id: "5nTtCOCds6I0PHMNtqelas",
		title: "Immaterial",
		artists: [
			{
				name: "SOPHIE",
				uri: "spotify:artist:5a2w2tgpLwv26BYJf2qYwu"
			}
		],
		coverArt: {
			extractedColors: {
				colorDark: {
					hex: "#785870"
				},
				colorLight: {
					hex: "#926B88"
				}
			},
			sources: [
				{
					url: "https://i.scdn.co/image/ab67616d00001e026b03d8c63599cc94263d7d60",
					width: 300,
					height: 300
				},
				{
					url: "https://i.scdn.co/image/ab67616d000048516b03d8c63599cc94263d7d60",
					width: 64,
					height: 64
				},
				{
					url: "https://i.scdn.co/image/ab67616d0000b2736b03d8c63599cc94263d7d60",
					width: 640,
					height: 640
				}
			]
		},
		releaseDate: {
			isoString: "2018-06-15T00:00:00Z"
		},
		duration: 232806,
		maxDuration: 232806,
		isPlayable: true,
		isExplicit: false,
		audioPreview: {
			url: "https://p.scdn.co/mp3-preview/97b5eb03593683855fffada4248fcfffe4dcc263",
			format: "MP3_96"
		},
		hasVideo: false,
		relatedEntityUri: "spotify:artist:5a2w2tgpLwv26BYJf2qYwu"
	},
	toTypeof
);

test("spotify: parseData from base64 resource script", async () => {
	const html = await readFile(
		path.join(import.meta.dirname, "../fixtures/spotify/base64.html"),
		"utf-8"
	);

	expect(mapValuesDeep(parseData(html), toTypeof)).toEqual(expected);
});

test("spotify: parseData from __NEXT_DATA__ script", async () => {
	const html = await readFile(
		path.join(import.meta.dirname, "../fixtures/spotify/nextjs.html"),
		"utf-8"
	);

	expect(mapValuesDeep(parseData(html), toTypeof)).toEqual(expected);
});

// ---- getData (rejections, offline) ----

test("spotify: getting data for empty url should reject", async () => {
	await expect(getData("")).rejects.toThrow(
		"Couldn't parse '' as a valid Spotify link"
	);
});

test("spotify: getting data for non url string should reject", async () => {
	const url = "arti39anptrackspotify:://https";

	await expect(getData(url)).rejects.toThrow(
		`Couldn't parse '${url}' as a valid Spotify link`
	);
});

test("spotify: getting data for non spotify url string should reject", async () => {
	const url = "http://google.com/5a2w2tgpLwv26BYJf2qYwu";

	await expect(getData(url)).rejects.toThrow(
		`Couldn't parse '${url}' as a valid Spotify link`
	);
});

// ---- getTracks (live) ----

test("spotify: get tracks for a track", async () => {
	const tracks = await getTracks(
		"https://open.spotify.com/track/5nTtCOCds6I0PHMNtqelas"
	);

	expect(Array.isArray(tracks)).toBe(true);
	expect(tracks[0].name).toBe("Immaterial");
	expect(tracks[0].previewUrl).toContain("/mp3-preview/");
});

test("spotify: get tracks for an artist", async () => {
	const tracks = await getTracks(
		"https://open.spotify.com/artist/5a2w2tgpLwv26BYJf2qYwu"
	);

	expect(Array.isArray(tracks)).toBe(true);
	expect(typeof tracks[0].name).toBe("string");
	expect(tracks[0].previewUrl).toContain("/mp3-preview/");
});

test("spotify: get tracks for an album", async () => {
	const tracks = await getTracks(
		"https://open.spotify.com/album/4tDBsfbHRJ9OdcMO9bmnai"
	);

	expect(Array.isArray(tracks)).toBe(true);
	expect(tracks[1].name).toBe("ELLE");
	expect(tracks[1].previewUrl).toContain("/mp3-preview/");
});

test("spotify: get tracks for a playlist", async () => {
	const tracks = await getTracks(
		"https://open.spotify.com/playlist/3Q4cPwMHY95ZHXtmcU2xvH"
	);

	expect(Array.isArray(tracks)).toBe(true);
	expect(tracks[1].name).toBe("ELLE");
	expect(tracks[1].previewUrl).toContain("/mp3-preview/");
});

test("spotify: get tracks for an episode", async () => {
	const tracks = await getTracks(
		"http://open.spotify.com/episode/64TORH3xleuD1wcnFsrH1E"
	);

	expect(Array.isArray(tracks)).toBe(true);
	expect(tracks[0].name).toBe("Hasty Treat - Modules in Node");
	expect(tracks[0].previewUrl).toContain(".spotifycdn.");
});
