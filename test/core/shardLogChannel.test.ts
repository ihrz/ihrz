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

const { packLines, createShardLog } =
	await import("../../src/core/modules/shardLogChannel.ts");

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("shard log channel", () => {
	test("lines are packed in order, no message over the limit", () => {
		expect(packLines(["a", "b", "c"], 10)).toEqual(["a\nb\nc"]);
		expect(packLines(["aaaa", "bbbb", "cccc"], 9)).toEqual([
			"aaaa\nbbbb",
			"cccc"
		]);
		const long = packLines(["x".repeat(30)], 10);
		expect(long).toHaveLength(1);
		expect(long[0]!.length).toBe(10);
	});

	test("a burst of events is one message, with a Discord timestamp per line", async () => {
		const sent: string[] = [];
		const log = createShardLog(
			undefined,
			"123456789012345678",
			async (c) => {
				sent.push(c);
			},
			20
		);
		log("🔄 Shard #0 reconnecting...");
		log("♻️ Shard #0 resumed");
		await wait(60);
		expect(sent).toHaveLength(1);
		expect(sent[0]!.split("\n")).toHaveLength(2);
		expect(sent[0]).toMatch(
			/^🔄 Shard #0 reconnecting\.\.\. · <t:\d+:T>\n♻️ Shard #0 resumed · <t:\d+:T>$/
		);
	});

	test("no channel (or an invalid one): nothing is sent", async () => {
		let calls = 0;
		const post = async () => void calls++;
		createShardLog("t", undefined, post, 5)("x");
		createShardLog("t", "", post, 5)("x");
		createShardLog("t", "not-an-id", post, 5)("x");
		await wait(30);
		expect(calls).toBe(0);
	});

	test("a failed post never throws to the shards", async () => {
		const log = createShardLog(
			undefined,
			"123456789012345678",
			async () => {
				throw new Error("Missing Access");
			},
			5
		);
		expect(() => log("x")).not.toThrow();
		await wait(30);
	});
});
