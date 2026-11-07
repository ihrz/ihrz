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

import { afterEach, describe, expect, test } from "bun:test";
import {
	giveawaysTable,
	initTables,
	resetTables
} from "../../../src/core/database/tables";

class FakeTable {
	public store = new Map<string, unknown>();

	set(key: string, value: unknown) {
		this.store.set(key, value);
		return this;
	}
}

function stubClient(requested: string[], fake: FakeTable) {
	return {
		db: {
			table: async (name: string) => {
				requested.push(name);
				return fake;
			}
		}
	} as never;
}

describe("database tables", () => {
	afterEach(() => resetTables());

	test("access before init throws a clear error", () => {
		expect(() => giveawaysTable.set).toThrow(
			'Database table "giveaways" used before the client is ready'
		);
	});

	test("after init calls are forwarded with the real table as this", async () => {
		const fake = new FakeTable();
		const requested: string[] = [];

		await initTables(stubClient(requested, fake), ["giveawaysTable"]);

		const result = (giveawaysTable as unknown as FakeTable).set("a", 1);
		expect(requested).toEqual(["giveaways"]);
		expect(fake.store.get("a")).toBe(1);
		expect(result).toBe(fake);
	});

	test("tables are opened in the given order", async () => {
		const requested: string[] = [];
		await initTables(stubClient(requested, new FakeTable()), [
			"tempTable",
			"ownerTable"
		]);
		expect(requested).toEqual(["temp", "owner"]);
	});
});
