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

// The music library on Discord: the Love button (musicLove.ts) and the pure
// parts of /music playlist (musicLibraryView.ts), on the memory driver.
import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";

import { Memory } from "../../src/core/database/driver/memory.ts";
import {
	blacklistTable,
	initTables,
	resetTables
} from "../../src/core/database/tables.ts";
import * as lib from "../../src/core/modules/musicLibrary.ts";
import {
	handleLoveClick,
	LOVE_REMOVE_BUTTON
} from "../../src/core/modules/musicLove.ts";
import * as view from "../../src/core/modules/musicLibraryView.ts";
import en from "../../src/lang/en-US.ts";

const U = "300000000000000000";
const lang = en as never as typeof en;

const lavalinkTrack = (n: number, over: Record<string, unknown> = {}) =>
	({
		encoded: `enc-${n}`,
		info: {
			identifier: `id${n}`,
			title: `Song ${n}`,
			author: "Artist",
			uri: `https://deezer.com/track/${n}`,
			artworkUrl: null,
			duration: 1000 * n,
			isStream: false,
			isSeekable: true,
			sourceName: "deezer",
			isrc: null,
			...over
		}
	}) as never;

// A button press: records its replies; the remove offer's message hands out
// a collector the test drives.
function press(userId = U) {
	const replies: any[] = [];
	const edits: any[] = [];
	const collectors: EventEmitter[] = [];
	const i = {
		user: { id: userId },
		reply: async (payload: any) => {
			replies.push(payload);
			return {
				resource: {
					message: {
						createMessageComponentCollector: (opts: any) => {
							const c = Object.assign(new EventEmitter(), {
								opts
							});
							collectors.push(c);
							return c;
						}
					}
				}
			};
		},
		editReply: async (payload: any) => edits.push(payload)
	};
	return { i: i as never, replies, edits, collectors };
}

const client = {
	config: { core: { blacklistPictureInEmbed: "https://img/bl.png" } }
} as never;

beforeEach(async () => {
	resetTables();
	await initTables({ db: new Memory() } as never, [
		"musicLibraryTable",
		"blacklistTable"
	]);
	lib.__libraryTest.keysCache.clear();
	lib.__libraryTest.keysGen.clear();
});
afterAll(() => resetTables());

describe("love decision", () => {
	test("no key: unavailable; liked: offer to remove; else like", () => {
		expect(view.loveAction(null, false)).toBe("unavailable");
		expect(view.loveAction(null, true)).toBe("unavailable");
		expect(view.loveAction("deezer:1", false)).toBe("like");
		expect(view.loveAction("deezer:1", true)).toBe("offer_remove");
	});
});

describe("Love button", () => {
	test("likes the track, ephemeral, no mentions", async () => {
		const { i, replies } = press();
		await handleLoveClick(client, lang, i, lavalinkTrack(1));
		expect(replies).toHaveLength(1);
		expect(replies[0].flags).toEqual([64]);
		expect(replies[0].allowedMentions).toEqual({ parse: [] });
		expect(replies[0].content).toContain("Song 1");
		expect(replies[0].content).toContain(en.music_library_liked_name);
		expect(replies[0].components).toEqual([]);
		expect((await lib.favoriteKeys(U)).has("deezer:id1")).toBe(true);
	});

	test("already liked: red remove button for the clicker, then removed", async () => {
		await handleLoveClick(client, lang, press().i, lavalinkTrack(2));
		const { i, replies, collectors } = press();
		await handleLoveClick(client, lang, i, lavalinkTrack(2));
		const button = replies[0].components[0].toJSON().components[0];
		expect(button.custom_id).toBe(LOVE_REMOVE_BUTTON);
		expect(button.style).toBe(4);
		expect(button.disabled).toBe(false);

		const collector = collectors[0] as any;
		expect(collector.opts.time).toBe(60_000);
		expect(collector.opts.max).toBe(1);
		expect(
			collector.opts.filter({
				user: { id: "1" },
				customId: LOVE_REMOVE_BUTTON
			})
		).toBe(false);

		const updates: any[] = [];
		collector.emit("collect", {
			update: async (p: any) => updates.push(p)
		});
		await new Promise((r) => setTimeout(r, 20));
		expect(updates[0].components).toEqual([]);
		expect(updates[0].content).toContain("removed");
		expect((await lib.favoriteKeys(U)).has("deezer:id2")).toBe(false);
	});

	test("the offer expires: its button is disabled", async () => {
		await handleLoveClick(client, lang, press().i, lavalinkTrack(3));
		const { i, edits, collectors } = press();
		await handleLoveClick(client, lang, i, lavalinkTrack(3));
		collectors[0]!.emit("end", new Map());
		await new Promise((r) => setTimeout(r, 10));
		const row = edits[0].components[0].toJSON();
		expect(row.components[0].disabled).toBe(true);
		expect((await lib.favoriteKeys(U)).has("deezer:id3")).toBe(true);
	});

	test("nothing playing / a track that can't be kept", async () => {
		const a = press();
		await handleLoveClick(client, lang, a.i, null);
		expect(a.replies[0].content).toBe(en.nowplaying_no_queue);

		const b = press();
		await handleLoveClick(
			client,
			lang,
			b.i,
			lavalinkTrack(4, { identifier: "" })
		);
		expect(b.replies[0].content).toContain("can't be added");
		expect((await lib.favoriteKeys(U)).size).toBe(0);
	});

	test("a blacklisted user is refused and nothing is kept", async () => {
		await blacklistTable.set(U, { blacklisted: true });
		const { i, replies } = press();
		await handleLoveClick(client, lang, i, lavalinkTrack(5));
		expect(replies[0].embeds).toHaveLength(1);
		expect(replies[0].flags).toEqual([64]);
		expect((await lib.favoriteKeys(U)).size).toBe(0);
	});
});

describe("library view", () => {
	test("pages: at least one, clamped", () => {
		expect(view.pageCount(0)).toBe(1);
		expect(view.pageCount(10)).toBe(1);
		expect(view.pageCount(11)).toBe(2);
		expect(view.clampPage(-1, 25)).toBe(0);
		expect(view.clampPage(5, 25)).toBe(2);
		expect(view.clampPage(1, 0)).toBe(0);
	});

	test("select values round-trip", () => {
		expect(view.parseLibraryValue(view.LIKED_VALUE)).toEqual({
			kind: "liked"
		});
		expect(view.parseLibraryValue(view.playlistValue("abcd1234"))).toEqual({
			kind: "playlist",
			id: "abcd1234"
		});
		expect(view.parseLibraryValue("pl:")).toBeNull();
		expect(view.parseLibraryValue("x")).toBeNull();
	});

	test("a typed name: value, id, same name, liked name, unique prefix", () => {
		const pls = [
			{ id: "aaaa1111", name: "Road trip" },
			{ id: "bbbb2222", name: "Rock" },
			{ id: "cccc3333", name: "Chill" }
		];
		const find = (q: string) =>
			view.findLibraryList(pls, q, "Liked tracks");
		expect(find("pl:bbbb2222")).toEqual({
			kind: "playlist",
			id: "bbbb2222"
		});
		expect(find("pl:zzzz0000")).toBeNull();
		expect(find("cccc3333")).toEqual({ kind: "playlist", id: "cccc3333" });
		expect(find("  ROCK ")).toEqual({ kind: "playlist", id: "bbbb2222" });
		expect(find("liked tracks")).toEqual({ kind: "liked" });
		expect(find("liked")).toEqual({ kind: "liked" });
		expect(find("ch")).toEqual({ kind: "playlist", id: "cccc3333" });
		expect(find("ro")).toBeNull(); // two playlists start with it
		expect(find("")).toBeNull();
	});

	test("overview: liked count then each playlist", () => {
		const lines = view.libraryOverviewLines(en as never, 12, [
			{ name: "Road*trip", count: 3, duration: 3_725_000 }
		]);
		expect(lines).toHaveLength(2);
		expect(lines[0]).toContain("Tracks: 12");
		expect(lines[1]).toContain("Road\\*trip");
		expect(lines[1]).toContain("Tracks: 3 · 1:02:05");
		expect(view.libraryOverviewLines(en as never, 0, [])[1]).toContain(
			en.music_playlist_no_playlists
		);
		expect(view.libraryIsEmpty(0, [])).toBe(true);
		expect(view.libraryIsEmpty(1, [])).toBe(false);
	});

	test("track line: number, link, live, long links dropped", () => {
		const t = lib.toLibraryTrack(lavalinkTrack(7))!;
		expect(view.libraryTrackLine(en as never, t, 0)).toBe(
			"`01` [**Song 7**](https://deezer.com/track/7)\n-# Artist · 0:07"
		);
		const live = {
			...t,
			isStream: true,
			uri: `https://x/${"a".repeat(300)}`
		};
		const line = view.libraryTrackLine(en as never, live, 11);
		expect(line.startsWith("`12` **Song 7**")).toBe(true);
		expect(line).toContain(en.nowplaying_live);
	});
});
