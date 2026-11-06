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

import {
	displayName,
	loadHistory,
	parseLegacyEntry,
	recordPrevname,
	sanitizeName
} from "../../src/core/modules/prevnamesHistory.ts";

/** Just enough of a table: get and set on a Map. */
function fakeTable(initial?: unknown) {
	const data = new Map<string, unknown>();
	if (initial !== undefined) data.set("1", initial);
	return {
		data,
		get: async (key: string) => data.get(key) ?? null,
		set: async (key: string, value: unknown) => {
			data.set(key, value);
			return value;
		}
	} as any;
}

const AT = new Date(1_700_000_000_000);
const GUILD = { id: "999449972615413861", name: "My Server" };

test("sanitizeName keeps real names, emojis and scripts", () => {
	expect(sanitizeName("kisakay")).toBe("kisakay");
	expect(sanitizeName("🏳️‍🌈 Anaïs")).toBe("🏳️‍🌈 Anaïs");
	expect(sanitizeName("夜に駆ける")).toBe("夜に駆ける");
	expect(sanitizeName("می‌خواهم")).toBe("می‌خواهم");
});

test("sanitizeName strips what should not be stored", () => {
	expect(sanitizeName("a\nb\tc\r\nd")).toBe("a b c d");
	expect(sanitizeName("  spaced    out  ")).toBe("spaced out");
	expect(sanitizeName("a​b‮c﻿d­e")).toBe("abcde");
	expect(sanitizeName("broken\uD83D")).toBe("broken");
	expect(Array.from(sanitizeName("é".repeat(300))!).length).toBe(100);
});

test("sanitizeName refuses nulls and names with nothing visible", () => {
	for (const value of [
		null,
		undefined,
		42,
		"",
		"   ",
		"null",
		"undefined",
		"​‍",
		"\n"
	]) {
		expect(sanitizeName(value)).toBeNull();
	}
});

test("the legacy parser turns every old format into typed entries", () => {
	expect(parseLegacyEntry("<t:5:d> - [username] kisa")).toEqual({
		type: "username",
		name: "kisa",
		at: 5000
	});
	expect(parseLegacyEntry("<t:5:d> - [globalName] Kisa")).toEqual({
		type: "displayname",
		name: "Kisa",
		at: 5000
	});
	expect(
		parseLegacyEntry("<t:5:d> - [nickname:My [cool] server] nick")
	).toEqual({
		type: "nickname",
		name: "server] nick",
		at: 5000,
		guild: { id: null, name: "My [cool" }
	});
	expect(parseLegacyEntry("<t:5:d> - [nickname:Serv] nick")).toEqual({
		type: "nickname",
		name: "nick",
		at: 5000,
		guild: { id: null, name: "Serv" }
	});
	expect(parseLegacyEntry("<t:5:d> - old name")).toEqual({
		type: "unknown",
		name: "old name",
		at: 5000
	});
	expect(parseLegacyEntry("plain")).toEqual({
		type: "unknown",
		name: "plain",
		at: null
	});
	expect(parseLegacyEntry("<t:5:d> - [username] null")).toBeNull();
});

test("loadHistory converts strings on load, alone or mixed with objects", () => {
	expect(
		loadHistory([
			"<t:1:d> - [username] a",
			{ type: "displayname", name: "B", at: 2000 },
			null,
			7,
			{ type: "username" },
			"<t:3:d> - [globalName] undefined"
		])
	).toEqual([
		{ type: "username", name: "a", at: 1000 },
		{ type: "displayname", name: "B", at: 2000 }
	]);
	expect(loadHistory(null)).toEqual([]);
	expect(loadHistory("nope")).toEqual([]);
});

test("loadHistory validates stored objects", () => {
	expect(
		loadHistory([
			{ type: "hacked", name: "a\nb", at: "soon" },
			{
				type: "nickname",
				name: "n",
				at: 1,
				guild: { id: "x", name: "\n" }
			}
		])
	).toEqual([
		{ type: "unknown", name: "a b", at: null },
		{ type: "nickname", name: "n", at: 1, guild: { id: null, name: "?" } }
	]);
});

test("loadHistory keeps a name once, at its latest date", () => {
	expect(
		loadHistory([
			"<t:1:d> - [username] a",
			"<t:2:d> - [username] b",
			{ type: "username", name: "a", at: 3000 }
		])
	).toEqual([
		{ type: "username", name: "b", at: 2000 },
		{ type: "username", name: "a", at: 3000 }
	]);
});

test("the same name of another type or server is not a duplicate", () => {
	expect(
		loadHistory([
			"<t:1:d> - [username] a",
			"<t:2:d> - [globalName] a",
			"<t:3:d> - [nickname:One] a",
			"<t:4:d> - [nickname:Two] a"
		]).length
	).toBe(4);
});

test("a guild id survives an old string of the same nickname", () => {
	const [entry] = loadHistory([
		{ type: "nickname", name: "n", at: 1000, guild: GUILD },
		"<t:2:d> - [nickname:My Server] n"
	]);
	expect(entry).toEqual({
		type: "nickname",
		name: "n",
		at: 2000,
		guild: GUILD
	});
});

test("loadHistory is stable: what it stores loads the same", () => {
	const once = loadHistory([
		"<t:1:d> - [nickname:Serv] a\nb",
		"<t:2:d> - [username] c",
		"plain"
	]);
	expect(loadHistory(once)).toEqual(once);
	expect(loadHistory(JSON.parse(JSON.stringify(once)))).toEqual(once);
});

test("recordPrevname converts the history and appends an object", async () => {
	const table = fakeTable(["<t:1:d> - [username] old"]);
	await recordPrevname(table, "1", { type: "username", name: "new\n" }, AT);
	expect(table.data.get("1")).toEqual([
		{ type: "username", name: "old", at: 1000 },
		{ type: "username", name: "new", at: AT.getTime() }
	]);
});

test("recordPrevname stores the server of a nickname", async () => {
	const table = fakeTable();
	await recordPrevname(
		table,
		"1",
		{ type: "nickname", name: "nick", guild: GUILD },
		AT
	);
	expect(table.data.get("1")).toEqual([
		{ type: "nickname", name: "nick", at: AT.getTime(), guild: GUILD }
	]);
});

test("recordPrevname ignores a null name", async () => {
	const table = fakeTable();
	await recordPrevname(table, "1", { type: "username", name: null }, AT);
	expect(table.data.has("1")).toBe(false);
});

test("two shards recording one change store it once", async () => {
	const table = fakeTable();
	const change = { type: "username", name: "a" } as const;
	await Promise.all([
		recordPrevname(table, "1", change, AT),
		recordPrevname(table, "1", change, AT)
	]);
	expect(table.data.get("1")).toEqual([
		{ type: "username", name: "a", at: AT.getTime() }
	]);
});

test("displayName shows names literally", () => {
	expect(displayName("<@123>")).toBe("\\<@123>");
	expect(displayName("**bold**")).toBe("\\*\\*bold\\*\\*");
	expect(displayName("<t:1:R>")).toBe("\\<t:1:R>");
});
