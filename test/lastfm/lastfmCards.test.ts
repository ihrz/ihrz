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

import { describe, expect, test } from "bun:test";

import {
	asList,
	formatCount,
	lastfmImage,
	mdLink,
	profileUrl
} from "../../src/core/modules/lastfmCards.ts";

describe("lastfm cards", () => {
	test("the best real image, never Last.fm's grey star", () => {
		const star =
			"https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png";
		expect(
			lastfmImage([
				{ size: "small", "#text": "https://img/s.png" },
				{ size: "extralarge", "#text": "https://img/xl.png" }
			])
		).toBe("https://img/xl.png");
		expect(lastfmImage([{ size: "extralarge", "#text": star }])).toBeNull();
		expect(lastfmImage(undefined)).toBeNull();
	});

	test("one item or several, always a list", () => {
		expect(asList({ a: 1 })).toEqual([{ a: 1 }]);
		expect(asList([1, 2])).toEqual([1, 2]);
		expect(asList(undefined)).toEqual([]);
	});

	test("links that can't break out of the markdown", () => {
		expect(
			mdLink("Song (Live)", "https://www.last.fm/music/a/_/Song+(Live)")
		).toBe(
			"[Song (Live)](https://www.last.fm/music/a/_/Song+%28Live%29)"
		);
		expect(mdLink("*bold*", "javascript:alert(1)")).toBe("\\*bold\\*");
		expect(mdLink("a]b", "https://x.test")).toBe("[a\\]b](https://x.test)");
		expect(profileUrl("a b")).toBe("https://www.last.fm/user/a%20b");
		expect(formatCount("12345")).toBe("12,345");
	});
});
