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

import {
	HISTORY_RETENTION_MS,
	exportText,
	formatListeningTime,
	formatTrackDuration,
	pageCount,
	pageOf,
	pruneHistory,
	recentArtworks,
	summarize
} from "../../src/core/modules/musicHistoryView.ts";

const NOW = Date.UTC(2026, 10, 5, 12, 0, 0);

function track(over: Record<string, unknown> = {}) {
	return {
		at: NOW - 60_000,
		requesterId: "10",
		title: "Midnight City",
		author: "M83",
		uri: "https://www.deezer.com/track/1",
		artworkUrl: "https://cdn.example/a.jpg",
		duration: 243_000,
		source: "deezer",
		...over
	};
}

test("prune keeps the last 30 days, in every field", () => {
	const old = Math.floor((NOW - HISTORY_RETENTION_MS - 1000) / 1000);
	const recent = Math.floor((NOW - 1000) / 1000);
	const { history, changed } = pruneHistory(
		{
			tracks: [track({ at: NOW - HISTORY_RETENTION_MS - 1 }), track()],
			embed: [`<t:${old}:R>: a`, `<t:${recent}:R>: b`, "no timestamp"],
			buffer: ["A", "B", "C"]
		},
		NOW
	);
	expect(changed).toBe(true);
	expect(history.tracks!.length).toBe(1);
	expect(history.embed).toEqual([`<t:${recent}:R>: b`, "no timestamp"]);
	expect(history.buffer).toEqual(["B", "C"]);
	expect(pruneHistory(history, NOW).changed).toBe(false);
	expect(pruneHistory(null, NOW).history.tracks).toEqual([]);
});

test("summary counts time and only highlights repeats", () => {
	const s = summarize([
		track({ requesterId: "1" }),
		track({ requesterId: "1", author: "Daft Punk", duration: 0 }),
		track({ requesterId: "2", author: "M83" }),
		track({ requesterId: null, author: null, duration: null })
	]);
	expect(s.count).toBe(4);
	expect(s.totalMs).toBe(486_000);
	expect(s.topArtist).toEqual({ name: "M83", count: 2 });
	expect(s.topRequester).toEqual({ id: "1", count: 2 });
	const once = summarize([
		track(),
		track({ author: "Other", requesterId: "2" })
	]);
	expect(once.topArtist).toBeNull();
	expect(once.topRequester).toBeNull();
});

test("durations read like a player", () => {
	expect(formatTrackDuration(243_000)).toBe("4:03");
	expect(formatTrackDuration(3_725_000)).toBe("1:02:05");
	expect(formatTrackDuration(0)).toBeNull();
	expect(formatTrackDuration(null)).toBeNull();
	expect(formatListeningTime(42 * 60_000)).toBe("42 min");
	expect(formatListeningTime(425 * 60_000)).toBe("7 h 05");
	expect(formatListeningTime(51 * 3_600_000)).toBe("2 d 3 h");
});

test("pages and artworks", () => {
	const items = Array.from({ length: 12 }, (_, i) => i);
	expect(pageCount(12)).toBe(3);
	expect(pageCount(0)).toBe(1);
	expect(pageOf(items, 2)).toEqual([10, 11]);
	const arts = recentArtworks([
		track({ at: 1, artworkUrl: "https://x/old.jpg" }),
		track({ at: 3, artworkUrl: "https://x/new.jpg" }),
		track({ at: 2, artworkUrl: "https://x/new.jpg" }),
		track({ at: 4, artworkUrl: "javascript:alert(1)" })
	]);
	expect(arts).toEqual(["https://x/new.jpg", "https://x/old.jpg"]);
});

test("export lists every play, newest first", () => {
	const text = exportText(
		"Chill",
		[
			track({ at: NOW - 120_000, title: "A" }),
			track({ title: "B", requesterId: "9" })
		],
		(id) => (id === "10" ? "alice" : null)
	);
	const lines = text.trim().split("\n");
	expect(lines[0]).toContain("Chill");
	expect(lines[2]).toContain("B - M83");
	expect(lines[2]).toContain("requested by 9");
	expect(lines[3]).toContain("requested by alice");
	expect(lines[3]).toContain("4:03");
});
