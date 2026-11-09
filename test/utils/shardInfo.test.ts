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

import type { Client } from "discord.js";

import {
	collectShardProbes,
	type ShardData
} from "../../src/core/functions/shard_helper.ts";
import { summarizeShards } from "../../src/core/modules/shardInfoCard.ts";

function shardData(overrides: Partial<ShardData> = {}): ShardData {
	return {
		pid: 1,
		status: 0,
		ping: 40,
		uptime: 1000,
		guilds: 10,
		unavailable: 1,
		exactMembers: 8,
		approximateMembers: 1,
		missingMembers: 0,
		members: 100,
		channels: 50,
		users: 20,
		voice: 2,
		rss: 1024,
		heapUsed: 512,
		samples: { unavailable: [], approximate: [], missing: [] },
		...overrides
	};
}

function shardedClient(
	count: number,
	answer: (shard: number) => Promise<ShardData>
): Client {
	return {
		shard: {
			count,
			broadcastEval: (_: unknown, options: { shard: number }) =>
				answer(options.shard)
		}
	} as unknown as Client;
}

test("a shard that rejects is reported without failing the others", async () => {
	const probes = await collectShardProbes(
		shardedClient(3, (shard) =>
			shard === 1
				? Promise.reject(new Error("no child"))
				: Promise.resolve(shardData({ pid: shard }))
		)
	);

	expect(probes.map((probe) => probe.data?.pid ?? null)).toEqual([
		0,
		null,
		2
	]);
});

test("a shard that never answers times out", async () => {
	const probes = await collectShardProbes(
		shardedClient(2, (shard) =>
			shard === 0 ? new Promise(() => {}) : Promise.resolve(shardData())
		),
		10
	);

	expect(probes[0].data).toBeNull();
	expect(probes[1].data).not.toBeNull();
});

test("totals only count shards that answered", () => {
	const totals = summarizeShards([
		{ id: 0, data: shardData({ ping: 20, guilds: 5, members: 50 }) },
		{ id: 1, data: null },
		{ id: 2, data: shardData({ ping: 60, status: 1 }) }
	]);

	expect(totals.shardCount).toBe(3);
	expect(totals.onlineCount).toBe(1);
	expect(totals.guilds).toBe(15);
	expect(totals.members).toBe(150);
	expect(totals.averagePing).toBe(40);
	expect(totals.highestPing).toBe(60);
	expect(totals.offlineIds).toEqual([1]);
});

test("a shard without heartbeat has no ping", () => {
	const totals = summarizeShards([{ id: 0, data: shardData({ ping: -1 }) }]);

	expect(totals.averagePing).toBeNull();
	expect(totals.highestPing).toBeNull();
});
