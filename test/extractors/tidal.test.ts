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

import tidalMusic from "../../src/core/extractors/tidal/index.js";

// The song and the album never change: their whole result is pinned.
const stableTargets = {
	song: {
		type: "song",
		url: "https://tidal.com/track/510366521/u"
	},
	album: {
		type: "album",
		url: "https://tidal.com/album/539234099/u"
	}
};

Object.values(stableTargets).forEach((target) => {
	test(`tidal: resolve ${target.type}`, async () => {
		await expect(tidalMusic(target.url)).resolves.toMatchSnapshot();
	});
});

// "TIDAL's Top Hits" is an editorial chart: Tidal reorders and replaces its
// tracks every week, so only the shape of the result is checked.
test("tidal: resolve playlist", async () => {
	const playlist = (await tidalMusic(
		"https://tidal.com/playlist/edf3b7d2-cb42-41d7-93c0-afa2a395521b"
	)) as {
		title: string;
		numTracks: number;
		tracks: {
			type: string;
			title: string;
			url: string;
			duration: number;
			artist: { name: string; url: string };
		}[];
	};
	expect(playlist.title).toBe("TIDAL's Top Hits");
	expect(playlist.tracks.length).toBeGreaterThan(0);
	expect(playlist.tracks.length).toBe(playlist.numTracks);
	for (const track of playlist.tracks) {
		expect(track.type).toBe("song");
		expect(track.title.length).toBeGreaterThan(0);
		expect(track.url).toMatch(/^https:\/\/tidal\.com\/track\/\d+$/);
		expect(track.duration).toBeGreaterThan(0);
		expect(track.artist.name.length).toBeGreaterThan(0);
		expect(track.artist.url).toMatch(/^https:\/\/tidal\.com\/artist\/\d+$/);
	}
});
