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

// Synced lyrics from the node (LavaLyrics `lines`) as the dashboard reads them.
import { describe, expect, test } from "bun:test";

import { toLyricsLines } from "../../src/core/functions/searchLyrics.ts";

describe("toLyricsLines", () => {
	test("sorted, ends from the duration or the next line, junk dropped", () => {
		expect(
			toLyricsLines([
				{ timestamp: 9_000, duration: 0, line: "  third  " },
				{ timestamp: 1_000, duration: 3_500, line: "first" },
				{ timestamp: 5_000, duration: 0, line: "second" },
				{ timestamp: "x", line: "bad" },
				null,
				{ timestamp: 12_000, line: 3 }
			])
		).toEqual([
			{ start: 1_000, end: 4_500, text: "first" },
			{ start: 5_000, end: 9_000, text: "second" },
			{ start: 9_000, end: 14_000, text: "third" }
		]);
	});

	test("plain lyrics or no answer: no lines", () => {
		expect(toLyricsLines(undefined)).toEqual([]);
		expect(toLyricsLines([])).toEqual([]);
		expect(toLyricsLines({ lines: [] })).toEqual([]);
	});
});
