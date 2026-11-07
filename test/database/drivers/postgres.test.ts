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

import { Postgres } from "../../../src/core/database/driver/postgres.ts";

function stubSql(select: () => Promise<any[]>) {
	const writes: string[] = [];
	const sql: any = (strings: TemplateStringsArray) => {
		const text = strings.join("?");
		if (text.includes("SELECT")) return select();
		writes.push(text);
		return Promise.resolve([]);
	};
	sql.connect = () => Promise.resolve();
	sql.unsafe = (name: string) => name;
	return { sql, writes };
}

test("postgres get and set surface a failed SELECT instead of treating it as a missing row", async () => {
	const { sql, writes } = stubSql(() =>
		Promise.reject(new Error("connection terminated"))
	);
	const driver = new Postgres({ sql });

	await expect(driver.get("guild")).rejects.toThrow("connection terminated");
	await expect(driver.get("guild.key")).rejects.toThrow(
		"connection terminated"
	);
	await expect(driver.set("guild.key", 1)).rejects.toThrow(
		"connection terminated"
	);
	await expect(driver.set("guild", { a: 1 })).rejects.toThrow(
		"connection terminated"
	);
	expect(writes.some((w) => w.includes("INSERT"))).toBe(false);
});

test("postgres get still returns null for a row that does not exist", async () => {
	const { sql } = stubSql(() => Promise.resolve([]));
	const driver = new Postgres({ sql });
	expect(await driver.get("guild")).toBeNull();
});
