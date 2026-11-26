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

// Remembered text searches (musicSearchCache.ts), on the memory driver.
import {
	afterAll,
	beforeEach,
	describe,
	expect,
	setSystemTime,
	test
} from "bun:test";

import type { Track } from "lavalink-client";

import type { DatabaseStructure } from "../../types/database_structure.js";
import { Memory } from "../../src/core/database/driver/memory.ts";
import {
	initTables,
	musicSearchTable,
	resetTables
} from "../../src/core/database/tables.ts";
import * as cache from "../../src/core/modules/musicSearchCache.ts";
import { searchQueryOnNode } from "../../src/core/functions/musicPlay.ts";

const track = (n: number, title = `Song ${n}`) => ({
	encoded: `enc-${n}`,
	info: {
		identifier: `id${n}`,
		title,
		author: "Artist",
		duration: 1000 * n,
		artworkUrl: null,
		uri: `https://www.deezer.com/track/${n}`,
		sourceName: "deezer",
		isSeekable: true,
		isStream: false,
		isrc: null
	},
	pluginInfo: { albumName: "Album" },
	requester: { id: "100000000000000001" }
});

const result = (tracks: ReturnType<typeof track>[], loadType = "search") =>
	({
		loadType,
		tracks,
		playlist: null,
		exception: null,
		pluginInfo: {}
	}) as never;

// lavalink-client's buildTrack, reduced to what the cache relies on.
const baseClient = {
	player: {
		utils: {
			buildTrack: (
				data: {
					encoded: string;
					info: Record<string, unknown> & {
						duration?: number;
						length?: number;
					};
					pluginInfo?: unknown;
				},
				requester: unknown
			) => ({
				encoded: data.encoded,
				info: {
					...data.info,
					duration: data.info.duration || data.info.length
				},
				pluginInfo: data.pluginInfo ?? {},
				userData: {},
				requester
			})
		}
	},
	func: {
		music_proximity: { isSimilar: () => true, similarity: () => 1 }
	}
};
const client = baseClient as never;

function fakeNode(answer: (query: string) => unknown) {
	const calls: string[] = [];
	return {
		calls,
		node: {
			search: async ({ query }: { query: string }) => {
				calls.push(query);
				return answer(query);
			}
		} as never
	};
}

const save = async (raw: string, source: cache.SearchSource, res: unknown) => {
	await cache.saveSearch(raw, source, res as never);
};

beforeEach(async () => {
	setSystemTime();
	resetTables();
	await initTables({ db: new Memory() } as never, ["musicSearchTable"]);
	cache.__searchCacheTest.reset();
});
afterAll(() => {
	setSystemTime();
	resetTables();
});

describe("normalization and keys", () => {
	test("lowercase, NFKC, punctuation, spaces and noise", () => {
		expect(cache.normalizeQuery("  Bohemian   RHAPSODY!! ")).toBe(
			"bohemian rhapsody"
		);
		expect(cache.normalizeQuery("Ｑｕｅｅｎ – Don't Stop Me Now")).toBe(
			"queen dont stop me now"
		);
		expect(
			cache.normalizeQuery("Daft Punk - One More Time (Official Video)")
		).toBe("daft punk one more time");
		expect(cache.normalizeQuery("Song [HD] (Lyrics)")).toBe("song");
		expect(cache.normalizeQuery("Numb official music video")).toBe("numb");
		// A meaningful bracket, and bare words that can be titles, stay.
		expect(cache.normalizeQuery("Song (feat. Rihanna)")).toBe(
			"song feat rihanna"
		);
		expect(cache.normalizeQuery("Audio")).toBe("audio");
		expect(cache.normalizeQuery("Lyrics")).toBe("lyrics");
		// Non-Latin scripts are kept.
		expect(cache.normalizeQuery("夜に駆ける YOASOBI")).toBe(
			"夜に駆ける yoasobi"
		);
	});

	test("keys never hold a dot", () => {
		for (const q of ["mr. brightside", "a.b.c", "夜に駆ける", "x"]) {
			const n = cache.normalizeQuery(q);
			expect(cache.recordKey(n, "auto")).toMatch(/^Q_[0-9a-f]{40}$/);
			expect(cache.bucketKey(n, "suggest")).toMatch(
				/^B_suggest_[0-9a-f]+$/
			);
		}
	});

	test("links are never remembered", async () => {
		expect(
			cache.cacheableQuery("https://open.spotify.com/track/abc")
		).toBeNull();
		expect(cache.cacheableQuery("www.youtube.com/watch?v=x")).toBeNull();
		expect(
			cache.saveSearch(
				"https://www.deezer.com/track/1",
				"auto",
				result([track(1)])
			)
		).toBeNull();
	});

	test("only successful searches are remembered", () => {
		expect(cache.saveSearch("some song", "auto", result([]))).toBeNull();
		expect(
			cache.saveSearch(
				"some song",
				"auto",
				result([track(1)], "playlist")
			)
		).toBeNull();
		expect(
			cache.saveSearch("some song", "auto", result([track(1)], "error"))
		).toBeNull();
		expect(cache.saveSearch("some song", "auto", undefined)).toBeNull();
	});
});

describe("fuzzy rules", () => {
	test("bounded Levenshtein", () => {
		expect(cache.boundedLevenshtein("kitten", "sitting", 5)).toBe(3);
		expect(cache.boundedLevenshtein("kitten", "sitting", 2)).toBe(3);
		expect(cache.boundedLevenshtein("abc", "abcdefgh", 2)).toBe(3);
	});

	test("accepted within tolerance, refused beyond, short or digits", () => {
		expect(
			cache.fuzzyDistance("bohemian rapsody", "bohemian rhapsody")
		).toBe(1);
		expect(
			cache.fuzzyDistance("bohemain rapsodi", "bohemian rhapsody")
		).toBe(null);
		// Short queries: never.
		expect(cache.fuzzyDistance("numbb", "numb")).toBeNull();
		// Only the digits differ: different songs.
		expect(cache.fuzzyDistance("my song 1", "my song 2")).toBeNull();
		expect(
			cache.fuzzyDistance("blink 182 dammit", "blink 182 damnit")
		).toBe(1);
	});
});

describe("lookups", () => {
	test("exact hit rebuilds the tracks for the current requester", async () => {
		await save("Bohemian Rhapsody", "auto", result([track(1), track(2)]));
		const hit = await cache.lookupSearch("bohemian  rhapsody!", "auto");
		expect(hit?.fuzzy).toBe(false);
		const res = cache.cachedResult(client, hit!, { id: "2" });
		expect(res.loadType).toBe("search");
		expect(res.tracks.map((t) => t.encoded)).toEqual(["enc-1", "enc-2"]);
		expect(res.tracks[0].requester).toEqual({ id: "2" });
		expect(res.tracks[0].info.duration).toBe(1000);
		expect(res.tracks[0].pluginInfo).toEqual({ albumName: "Album" });
		// No user id is stored.
		const stored = await musicSearchTable.get(hit!.key);
		expect(JSON.stringify(stored)).not.toContain("100000000000000001");
	});

	test("keeps the first 5 tracks for play", async () => {
		await save(
			"many results",
			"auto",
			result([1, 2, 3, 4, 5, 6, 7].map((n) => track(n)))
		);
		const hit = await cache.lookupSearch("many results", "auto");
		expect(hit!.record.tracks).toHaveLength(5);
	});

	test("fuzzy hit within tolerance, miss beyond", async () => {
		await save("bohemian rhapsody", "auto", result([track(1)]));
		cache.__searchCacheTest.reset();
		const hit = await cache.lookupSearch("Bohemian Rapsody", "auto");
		expect(hit?.fuzzy).toBe(true);
		expect(hit?.record.q).toBe("bohemian rhapsody");
		expect(await cache.lookupSearch("bohemain rapsodi", "auto")).toBeNull();
	});

	test("sources never mix", async () => {
		await save("bohemian rhapsody", "suggest", result([track(1)]));
		expect(
			await cache.lookupSearch("bohemian rhapsody", "auto")
		).toBeNull();
		expect(await cache.lookupSearch("bohemian rapsody", "auto")).toBeNull();
		expect(
			await cache.lookupSearch("bohemian rhapsody", "suggest")
		).not.toBeNull();
	});

	test("a record expires after 14 days", async () => {
		const t0 = new Date("2026-11-01T00:00:00Z");
		setSystemTime(t0);
		await save("old song title", "auto", result([track(1)]));
		setSystemTime(new Date(t0.getTime() + cache.RECORD_TTL_MS - 1000));
		expect(
			await cache.lookupSearch("old song title", "auto")
		).not.toBeNull();
		setSystemTime(new Date(t0.getTime() + cache.RECORD_TTL_MS + 1000));
		expect(await cache.lookupSearch("old song title", "auto")).toBeNull();
		expect(await cache.lookupSearch("old song titl", "auto")).toBeNull();
	});

	test("a track that fails to play forgets its record and index entry", async () => {
		await save("dead track song", "auto", result([track(9)]));
		const hit = await cache.lookupSearch("dead track song", "auto");
		cache.cachedResult(client, hit!, { id: "2" });
		expect(await cache.forgetFailedTrack("enc-9")).toBe(true);
		expect(await musicSearchTable.get(hit!.key)).toBeNull();
		const bucket = (await musicSearchTable.get(
			cache.bucketKey("dead track song", "auto")
		)) as DatabaseStructure.MusicSearchBucket;
		expect(bucket.entries).toEqual([]);
		expect(await cache.lookupSearch("dead track song", "auto")).toBeNull();
		// A track that did not come from a record changes nothing.
		expect(await cache.forgetFailedTrack("enc-unknown")).toBe(false);
	});

	test("the index bucket is capped, most recent first", async () => {
		const key = cache.bucketKey("aa", "auto");
		await musicSearchTable.set(key, {
			entries: Array.from({ length: cache.BUCKET_CAP }, (_, i) => ({
				q: `aa old ${"x".repeat(i % 7)} ${i}`,
				at: i
			}))
		});
		await save("aa newest song", "auto", result([track(1)]));
		const bucket = (await musicSearchTable.get(
			key
		)) as DatabaseStructure.MusicSearchBucket;
		expect(bucket.entries).toHaveLength(cache.BUCKET_CAP);
		expect(bucket.entries[0].q).toBe("aa newest song");
	});
});

describe("search path (searchQueryOnNode)", () => {
	test("first search asks the node and saves, the next one does not", async () => {
		const { node, calls } = fakeNode(() =>
			result([track(1, "Never Gonna Give You Up")])
		);
		const first = await searchQueryOnNode(
			client,
			node,
			"never gonna give you up",
			{ id: "1" } as never
		);
		expect(first?.tracks[0]?.encoded).toBe("enc-1");
		expect(calls).toHaveLength(1);
		// Let the background save land.
		await Bun.sleep(5);

		const again = await searchQueryOnNode(
			client,
			node,
			"Never Gonna Give You Up!",
			{ id: "2" } as never
		);
		expect(calls).toHaveLength(1);
		expect(again?.tracks[0]?.encoded).toBe("enc-1");
		expect((again?.tracks[0] as Track).requester).toEqual({ id: "2" });

		const typo = await searchQueryOnNode(
			client,
			node,
			"never gona give you up",
			{ id: "3" } as never
		);
		expect(calls).toHaveLength(1);
		expect(typo?.tracks[0]?.encoded).toBe("enc-1");
	});

	test("an empty answer is not remembered", async () => {
		const { node, calls } = fakeNode(() => result([]));
		await searchQueryOnNode(client, node, "nothing matches this", {
			id: "1"
		} as never);
		await Bun.sleep(5);
		await searchQueryOnNode(client, node, "nothing matches this", {
			id: "1"
		} as never);
		// Deezer then SoundCloud, twice.
		expect(calls).toHaveLength(4);
	});
});

describe("suggestions (autocomplete and dashboard search)", () => {
	test("a remembered suggestion list answers without the node", async () => {
		const { searchTrackSuggestions } =
			await import("../../src/core/modules/musicAutocomplete.ts");
		const { node, calls } = fakeNode(() =>
			result([1, 2, 3].map((n) => track(n, `Daft Punk ${n}`)))
		);
		const withNode = {
			...baseClient,
			player: {
				...baseClient.player,
				nodeManager: { nodes: new Map([["n", node]]) }
			}
		} as never;
		const first = await searchTrackSuggestions(
			withNode,
			{ id: "1" } as never,
			"daft punk around"
		);
		expect(first).toHaveLength(3);
		expect(calls).toHaveLength(1);
		await Bun.sleep(5);
		const again = await searchTrackSuggestions(
			withNode,
			{ id: "1" } as never,
			"Daft Punk Around"
		);
		expect(again.map((s) => s.choice.value)).toEqual(
			first.map((s) => s.choice.value)
		);
		expect(calls).toHaveLength(1);
		// The play pipeline has its own records.
		expect(await cache.lookupSearch("daft punk around", "auto")).toBeNull();
	});

	test("partial words are not remembered", async () => {
		const { searchTrackSuggestions } =
			await import("../../src/core/modules/musicAutocomplete.ts");
		const { node } = fakeNode(() => result([track(1)]));
		const withNode = {
			...baseClient,
			player: {
				...baseClient.player,
				nodeManager: { nodes: new Map([["n", node]]) }
			}
		} as never;
		await searchTrackSuggestions(withNode, { id: "1" } as never, "daf");
		await Bun.sleep(5);
		expect(await cache.lookupSearch("daf", "suggest")).toBeNull();
	});
});
