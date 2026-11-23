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

import { event } from "../../src/Events/utils/leashModule.ts";

const MIN = 60_000;

function setup(leashes: unknown[], config?: unknown) {
	const store = new Map<string, unknown>([["g.UTILS.LEASH", leashes]]);
	if (config) store.set("g.UTILS.LEASH_CONFIG", config);
	const client: any = {
		db: {
			get: async (key: string) => store.get(key) ?? null,
			set: async (key: string, value: unknown) => {
				store.set(key, value);
			}
		},
		timeCalculator: { to_ms: () => 30 * MIN }
	};
	const cache = new Map<string, any>();
	const guild = { id: "g", members: { cache } };
	const moves: string[] = [];
	const add = (id: string, channelId: string | null) => {
		const m: any = {
			id,
			voice: {
				channelId,
				get channel() {
					return m.voice.channelId ? { id: m.voice.channelId } : null;
				},
				setChannel: async (to: { id: string }) => {
					moves.push(`${id}->${to.id}`);
					m.voice.channelId = to.id;
				}
			}
		};
		cache.set(id, m);
		return m;
	};
	const state = (m: any, channelId: string | null) =>
		({
			member: m,
			guild,
			channelId,
			channel: channelId ? { id: channelId } : null
		}) as any;
	return { client, store, add, state, moves };
}

test("a held member who leaves the holder's channel is brought back", async () => {
	const t = setup([{ dom: "dom", sub: "sub", timestamp: Date.now() }]);
	t.add("dom", "A");
	const sub = t.add("sub", "B");

	await event.run(t.client, t.state(sub, "A"), t.state(sub, "B"));

	expect(t.moves).toEqual(["sub->A"]);
});

test("the held member follows the holder", async () => {
	const t = setup([{ dom: "dom", sub: "sub", timestamp: Date.now() }]);
	const dom = t.add("dom", "B");
	t.add("sub", "A");

	await event.run(t.client, t.state(dom, "A"), t.state(dom, "B"));

	expect(t.moves).toEqual(["sub->B"]);
});

test("the leash lasts the configured time, not a fixed 30 minutes", async () => {
	// 60 minutes configured, leash taken 45 minutes ago: still on.
	const t = setup(
		[{ dom: "dom", sub: "sub", timestamp: Date.now() - 45 * MIN }],
		{ maxLeashTime: 60 * MIN }
	);
	const dom = t.add("dom", "B");
	t.add("sub", "A");

	await event.run(t.client, t.state(dom, "A"), t.state(dom, "B"));

	expect(t.moves).toEqual(["sub->B"]);
	expect((t.store.get("g.UTILS.LEASH") as unknown[]).length).toBe(1);
});

test("a leash older than the configured time is dropped", async () => {
	const t = setup(
		[{ dom: "dom", sub: "sub", timestamp: Date.now() - 11 * MIN }],
		{ maxLeashTime: 10 * MIN }
	);
	const dom = t.add("dom", "B");
	t.add("sub", "A");

	await event.run(t.client, t.state(dom, "A"), t.state(dom, "B"));

	expect(t.moves).toEqual([]);
	expect(t.store.get("g.UTILS.LEASH")).toEqual([]);
});
