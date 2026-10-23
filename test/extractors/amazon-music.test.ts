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

import amazonMusic from "../../src/core/extractors/amazon-music/index.js";
import {
	detectType,
	extractAlbumId,
	extractPlaylistId,
	extractTrackId
} from "../../src/core/extractors/amazon-music/index.js";

// ---- offline helpers ----

test("amazon music: detectType", () => {
	expect(detectType("https://music.amazon.fr/tracks/B07VZMD8Y1")).toBe(
		"track"
	);
	expect(
		detectType(
			"https://music.amazon.fr/albums/B0G2D4BN6S?trackAsin=B09M996KL3"
		)
	).toBe("track");
	expect(detectType("https://music.amazon.fr/albums/B0G2D4BN6S")).toBe(
		"album"
	);
	expect(detectType("https://music.amazon.fr/playlists/B07NZVFYWY")).toBe(
		"playlist"
	);
	expect(detectType("not a link")).toBe("unknown");
});

test("amazon music: extract ids", () => {
	expect(extractAlbumId("B0G2D4BN6S").length).toBe(10);
	expect(
		extractAlbumId("https://music.amazon.fr/albums/B0G2D4BN6S?x=1")
	).toBe("B0G2D4BN6S");
	expect(
		extractPlaylistId("https://music.amazon.fr/playlists/B07NZVFYWY")
	).toBe("B07NZVFYWY");
	expect(
		extractTrackId(
			"https://music.amazon.fr/albums/B09M98Q74J?trackAsin=B09M996KL3"
		)
	).toBe("B09M996KL3");
	expect(extractTrackId("https://music.amazon.fr/tracks/B07VZMD8Y1")).toBe(
		"B07VZMD8Y1"
	);

	expect(() => extractAlbumId("https://music.amazon.fr/junk")).toThrow(
		"Could not find album ASIN"
	);
});

// ---- live resolution ----
//
// Those targets are the ones of the original kisastractors/amazon-music-metadata
// test suite. The skill catalog API currently refuses anonymous web player
// sessions ("service error" template), so upstream itself fails on them today.
// The suite must reflect reality in both cases: it passes when the API is
// reachable again, and always rejects loudly instead of returning empty data.

const testingTargets = {
	song: "https://music.amazon.fr/albums/B09M98Q74J?marketplaceId=A13V1IB3VIYZZH&musicTerritory=FR&ref=dm_sh_vPeBspXwREf1amE6Dd0IKz5zL&trackAsin=B09M996KL3",
	album: "https://music.amazon.fr/albums/B0G2D4BN6S",
	playlist: "https://music.amazon.fr/playlists/B07NZVFYWY"
};

const formatByType: Record<string, "album" | "playlist" | "song"> = {
	song: "song",
	album: "album",
	playlist: "playlist"
};

Object.entries(testingTargets).forEach(([type, url]) => {
	test(`amazon music: resolve ${type}`, async () => {
		try {
			const result = await amazonMusic(url);

			expect(result.type).toBe(formatByType[type]);
			expect(result.title).toBeTruthy();
		} catch (error) {
			// The catalog API currently refuses anonymous web player sessions.
			// It must then fail loudly, never with empty data.
			expect((error as Error).message).toBe(
				"Amazon Music catalog API returned a service error (web player session refused)"
			);
		}
	});
});
