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
import { Collection, type Guild } from "discord.js";
import { pruneBuyableRoles } from "../../src/core/functions/economyHelper.js";

const KEY = "g.ECONOMY.buyableRoles";

function makeGuild(
	stored: Record<string, { price: number }> | null,
	cached: string[],
	fetched: string[] | null
) {
	const deleted: string[] = [];
	const guild = {
		id: "g",
		client: {
			db: {
				get: async () => stored,
				delete: async (path: string) => {
					deleted.push(path);
				}
			}
		},
		roles: {
			cache: new Set(cached),
			fetch: async () => {
				if (!fetched) throw new Error("unavailable");
				return new Collection(fetched.map((id) => [id, {}]));
			}
		}
	} as unknown as Guild;
	return { guild, deleted };
}

describe("pruneBuyableRoles", () => {
	test("removes entries whose role no longer exists", async () => {
		const { guild, deleted } = makeGuild(
			{ alive: { price: 1 }, gone: { price: 2 } },
			["alive"],
			["alive"]
		);
		expect(await pruneBuyableRoles(guild)).toEqual({
			alive: { price: 1 }
		});
		expect(deleted).toEqual([`${KEY}.gone`]);
	});

	test("keeps a role missing from the cache but returned by the fetch", async () => {
		const { guild, deleted } = makeGuild(
			{ uncached: { price: 1 } },
			[],
			["uncached"]
		);
		expect(await pruneBuyableRoles(guild)).toEqual({
			uncached: { price: 1 }
		});
		expect(deleted).toEqual([]);
	});

	test("removes nothing when the roles cannot be fetched", async () => {
		const { guild, deleted } = makeGuild({ gone: { price: 1 } }, [], null);
		expect(await pruneBuyableRoles(guild)).toEqual({
			gone: { price: 1 }
		});
		expect(deleted).toEqual([]);
	});

	test("returns an empty object when the shop was never set", async () => {
		const { guild } = makeGuild(null, [], []);
		expect(await pruneBuyableRoles(guild)).toEqual({});
	});
});
