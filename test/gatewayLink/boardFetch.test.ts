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

import { describe, expect, mock, test } from "bun:test";
import { readyTables } from "../readyTables.ts";

mock.module("../../src/Events/client/ready.js", () => readyTables());
mock.module("../../src/core/modules/giveawaysDatabaseManager.js", () => ({
	default: {},
	dedupeEntries: (e: string[] | undefined) => [...new Set(e || [])]
}));

const { fetchBoardMessages } =
	await import("../../src/core/modules/gatewayLinkActions/community.ts");

// A board channel holding `ids` (newest first), with a call counter.
function channel(ids: bigint[], cached: string[] = []) {
	const calls = { bulk: 0, single: 0 };
	const all = [...ids].sort((a, b) => (a > b ? -1 : 1));
	const msg = (id: string) => ({ id });
	const messages = {
		cache: new Map(cached.map((id) => [id, msg(id)])),
		fetch: async (q: string | { limit: number; before: string }) => {
			if (typeof q === "string") {
				calls.single++;
				return all.includes(BigInt(q))
					? msg(q)
					: Promise.reject(new Error("404"));
			}
			calls.bulk++;
			const page = all
				.filter((id) => id < BigInt(q.before))
				.slice(0, q.limit);
			return new Map(page.map((id) => [String(id), msg(String(id))]));
		}
	};
	return { ch: { messages } as any, calls };
}

const BASE = 1300000000000000000n;
const ids = (n: number, step = 1n) =>
	Array.from({ length: n }, (_, i) => BASE + BigInt(i) * step);

describe("board messages of a page", () => {
	test("a page of 25 is one Discord call, not 25", async () => {
		const board = ids(200);
		const { ch, calls } = channel(board);
		const page = board.slice(150, 175).map(String);
		const found = await fetchBoardMessages(ch, page);
		expect(found.size).toBe(25);
		expect(calls).toEqual({ bulk: 1, single: 0 });
	});

	test("cached messages cost nothing", async () => {
		const board = ids(30);
		const page = board.slice(0, 10).map(String);
		const { ch, calls } = channel(board, page);
		expect((await fetchBoardMessages(ch, page)).size).toBe(10);
		expect(calls).toEqual({ bulk: 0, single: 0 });
	});

	test("a deleted board message is not asked for one by one", async () => {
		const board = ids(50);
		const { ch, calls } = channel(board.filter((_, i) => i !== 20));
		const page = board.slice(10, 30).map(String);
		const found = await fetchBoardMessages(ch, page);
		expect(found.size).toBe(19);
		expect(calls.single).toBe(0);
	});

	test("messages out of reach of the bulk reads fall back to single reads", async () => {
		// Board messages far apart, with many other messages in between.
		const noise = ids(700);
		const old = BASE - 5000n;
		const { ch, calls } = channel([...noise, old]);
		const found = await fetchBoardMessages(ch, [
			String(noise[699]),
			String(old)
		]);
		expect(found.size).toBe(2);
		expect(calls.bulk).toBe(5);
		expect(calls.single).toBe(1);
	});
});
