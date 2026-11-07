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
import { acquireEconomyLock } from "../../src/Interaction/HybridCommands/economy/economyLock.js";

describe("acquireEconomyLock", () => {
	test("refuses a second acquire for the same member", () => {
		const release = acquireEconomyLock("guild", "user");
		expect(release).not.toBeNull();
		expect(acquireEconomyLock("guild", "user")).toBeNull();
		release!();
	});

	test("can be acquired again after release", () => {
		acquireEconomyLock("guild", "user2")!();
		const again = acquireEconomyLock("guild", "user2");
		expect(again).not.toBeNull();
		again!();
	});

	test("different members and guilds do not block each other", () => {
		const a = acquireEconomyLock("guild", "a");
		const b = acquireEconomyLock("guild", "b");
		const c = acquireEconomyLock("other", "a");
		expect(a && b && c).toBeTruthy();
		a!();
		b!();
		c!();
	});

	test("concurrent runs: only one passes the check", async () => {
		let balance = 100;
		const run = async () => {
			const release = acquireEconomyLock("guild", "racer");
			if (!release) return false;
			try {
				if (balance < 100) return false;
				await new Promise((r) => setTimeout(r, 5));
				balance -= 100;
				return true;
			} finally {
				release();
			}
		};
		const results = await Promise.all([run(), run(), run()]);
		expect(results.filter(Boolean).length).toBe(1);
		expect(balance).toBe(0);
	});
});
