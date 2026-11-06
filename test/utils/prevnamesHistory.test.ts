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
	cleanHistory,
	displayName,
	parseEntry,
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

test("cleanHistory drops null entries and non-strings", () => {
	expect(
		cleanHistory([
			"<t:1:d> - [username] null",
			"<t:2:d> - [globalName] undefined",
			null,
			7,
			"<t:3:d> - [username] kisa"
		])
	).toEqual(["<t:3:d> - [username] kisa"]);
	expect(cleanHistory(null)).toEqual([]);
	expect(cleanHistory("nope")).toEqual([]);
});

test("cleanHistory keeps a name once, at its latest date", () => {
	expect(
		cleanHistory([
			"<t:1:d> - [username] a",
			"<t:2:d> - [username] b",
			"<t:3:d> - [username] a"
		])
	).toEqual(["<t:2:d> - [username] b", "<t:3:d> - [username] a"]);
});

test("cleanHistory removes the copies written by several shards", () => {
	expect(
		cleanHistory([
			"<t:5:d> - [username] a",
			"<t:5:d> - [globalName] A",
			"<t:5:d> - [username] a",
			"<t:6:d> - [globalName] A"
		])
	).toEqual(["<t:5:d> - [username] a", "<t:6:d> - [globalName] A"]);
});

test("the same name of another kind or server is not a duplicate", () => {
	const history = [
		"<t:1:d> - [username] a",
		"<t:2:d> - [globalName] a",
		"<t:3:d> - [nickname:One] a",
		"<t:4:d> - [nickname:Two] a"
	];
	expect(cleanHistory(history)).toEqual(history);
});

test("cleanHistory keeps old entries without a type or a date", () => {
	expect(cleanHistory(["<t:1:d> - old name", "plain"])).toEqual([
		"<t:1:d> - old name",
		"plain"
	]);
	expect(parseEntry("<t:1:d> - old name")).toEqual({
		seconds: 1,
		tag: null,
		value: "old name"
	});
});

test("cleanHistory is stable: a clean history is left as it is", () => {
	const once = cleanHistory([
		"<t:1:d> - [nickname:Serv] a\nb",
		"<t:2:d> - [username] c"
	]);
	expect(cleanHistory(once)).toEqual(once);
});

test("recordPrevname appends a clean entry", async () => {
	const table = fakeTable(["<t:1:d> - [username] old"]);
	await recordPrevname(table, "1", { kind: "username", value: "new\n" }, AT);
	expect(table.data.get("1")).toEqual([
		"<t:1:d> - [username] old",
		"<t:1700000000:d> - [username] new"
	]);
});

test("recordPrevname ignores a null name", async () => {
	const table = fakeTable();
	await recordPrevname(table, "1", { kind: "username", value: null }, AT);
	expect(table.data.has("1")).toBe(false);
});

test("two shards recording one change store it once", async () => {
	const table = fakeTable();
	const change = { kind: "username", value: "a" } as const;
	await Promise.all([
		recordPrevname(table, "1", change, AT),
		recordPrevname(table, "1", change, AT)
	]);
	expect(table.data.get("1")).toEqual(["<t:1700000000:d> - [username] a"]);
});

test("a bracket in a server name cannot break the entry", async () => {
	const table = fakeTable();
	await recordPrevname(
		table,
		"1",
		{ kind: "nickname", guild: "My [cool] server", value: "nick" },
		AT
	);
	const [entry] = table.data.get("1");
	expect(parseEntry(entry)).toEqual({
		seconds: 1700000000,
		tag: "nickname:My (cool) server",
		value: "nick"
	});
});

test("displayName shows names literally", () => {
	expect(displayName("<@123>")).toBe("\\<@123>");
	expect(displayName("**bold**")).toBe("\\*\\*bold\\*\\*");
	expect(displayName("<t:1:R>")).toBe("\\<t:1:R>");
});
