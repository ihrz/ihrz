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

import { afterEach, expect, test } from "bun:test";

import {
	canCrossfade,
	crossfadeSkip,
	SKIP_CROSSFADE_MS
} from "../../src/core/modules/musicCrossfadeSkip.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = realFetch;
});

type Call = { method: string; path: string; body: Record<string, unknown> };

/** Answers like a Wavyzon node; `refuse` makes a route fail. */
function fakeNode(state: Record<string, unknown> = {}, refuse?: string) {
	const calls: Call[] = [];
	globalThis.fetch = (async (url: string, init: RequestInit) => {
		const path = String(url).split("/players/1")[1];
		calls.push({
			method: String(init.method),
			path,
			body: init.body ? JSON.parse(String(init.body)) : {}
		});
		if (refuse === path) return new Response("{}", { status: 422 });
		if (init.method === "GET") {
			return Response.json({
				state: { player: { positionMs: 10_000, ...state } }
			});
		}
		return path === "/mix/deckb"
			? Response.json({ instance: 2 })
			: new Response(null, { status: 204 });
	}) as typeof fetch;
	return calls;
}

function fakePlayer(
	opts: { wavyzon?: boolean; tracks?: string[]; repeat?: string } = {}
) {
	const data = new Map<string, unknown>();
	const updates: unknown[] = [];
	const skips: number[] = [];
	const track = (encoded: string) => ({
		encoded,
		info: { duration: 200_000, isStream: false }
	});
	const queue = {
		current: track("A") as ReturnType<typeof track> | null,
		tracks: (opts.tracks ?? ["B", "C"]).map(track),
		previous: [] as ReturnType<typeof track>[],
		options: { maxPreviousTracks: 25 },
		utils: { save: async () => undefined },
		splice: async (start: number, count: number) =>
			queue.tracks.splice(start, count)
	};
	data.set("internal_wavyzon_next_track", "B");
	const player = {
		guildId: "1",
		repeatMode: opts.repeat ?? "off",
		queue,
		node: {
			sessionId: "s",
			info: opts.wavyzon === false ? {} : { wavyzon: "1" },
			options: {
				secure: false,
				host: "node",
				port: 1,
				authorization: "x"
			},
			updatePlayer: async (u: {
				playerOptions: { nextTrack: { encoded: string | null } };
			}) => {
				updates.push(u.playerOptions.nextTrack.encoded);
			}
		},
		getData: (k: string) => data.get(k),
		setData: (k: string, v: unknown) => data.set(k, v),
		skip: async (to = 0) => {
			skips.push(to);
		}
	};
	return { player: player as never, queue, updates, skips };
}

test("a skip loads deck B, fades, then advances the queue", async () => {
	const calls = fakeNode();
	const { player, queue, updates, skips } = fakePlayer();
	await crossfadeSkip(player);
	expect(skips).toEqual([]);
	expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
		"GET ",
		"POST /mix/deckb",
		"POST /mix/crossfade"
	]);
	expect(calls[1].body).toEqual({ encodedTrack: "B", position: 0 });
	expect(calls[2].body).toEqual({
		durationMs: SKIP_CROSSFADE_MS,
		curve: "equal_power"
	});
	expect(queue.current?.encoded).toBe("B");
	expect(queue.tracks.map((t) => t.encoded)).toEqual(["C"]);
	expect(queue.previous.map((t) => t.encoded)).toEqual(["A"]);
	expect(updates).toEqual(["C"]); // not the track that now plays
});

test("jumping in the queue fades into that track", async () => {
	const calls = fakeNode();
	const { player, queue } = fakePlayer({ tracks: ["B", "C", "D"] });
	await crossfadeSkip(player, 2);
	expect(calls[1].body.encodedTrack).toBe("C");
	expect(queue.current?.encoded).toBe("C");
	expect(queue.tracks.map((t) => t.encoded)).toEqual(["D"]);
});

test("repeat queue sends the old track to the end", async () => {
	fakeNode();
	const { player, queue } = fakePlayer({ repeat: "queue" });
	await crossfadeSkip(player);
	expect(queue.tracks.map((t) => t.encoded)).toEqual(["C", "A"]);
});

test("falls back to a plain skip, queue untouched", async () => {
	const cases: [Record<string, unknown>, string | undefined, boolean][] = [
		[{ mixing: true }, undefined, true],
		[{ paused: true }, undefined, true],
		[{ mixArmedAtMs: 5000 }, undefined, true],
		[{ positionMs: 195_000 }, undefined, true], // near the end
		[{}, "/mix/deckb", true], // the node can't play the track
		[{}, "/mix/crossfade", true],
		[{}, undefined, false] // plain Lavalink
	];
	for (const [state, refuse, wavyzon] of cases) {
		const calls = fakeNode(state, refuse);
		const { player, queue, skips } = fakePlayer({ wavyzon });
		await crossfadeSkip(player, 2);
		expect(skips).toEqual([2]);
		expect(queue.current?.encoded).toBe("A");
		expect(queue.tracks.length).toBe(2);
		if (!wavyzon) expect(calls).toEqual([]);
	}
});

test("a second skip during the setup is ignored", async () => {
	fakeNode();
	const { player, queue, skips } = fakePlayer();
	await Promise.all([crossfadeSkip(player), crossfadeSkip(player)]);
	expect(skips).toEqual([]);
	expect(queue.current?.encoded).toBe("B");
});

test("streams have no end to be near", () => {
	expect(canCrossfade({}, { isStream: true, duration: 0 })).toBe(true);
	expect(canCrossfade({ positionMs: 9 }, null)).toBe(false);
});
