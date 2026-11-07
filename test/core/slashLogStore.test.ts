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

import {
	SLASH_LOG_RETENTION_DAYS,
	SlashLogEntry,
	SlashLogStore,
	SlashLogTable,
	addToDayStats,
	emptyDayStats,
	expiredKeys,
	normalizeDayStats,
	slashLogDayKey,
	slashLogHourKey
} from "../../src/core/modules/slashLogStore.ts";
import { legacyEntry } from "../../src/Events/logs/slashCommandLogger.ts";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T = Date.UTC(2026, 10, 7, 14, 30); // 2026-11-07 14:30 UTC

function entry(at: number, extra: Partial<SlashLogEntry> = {}): SlashLogEntry {
	return {
		at,
		guildId: "g1",
		guildName: "Guild",
		channelId: "c1",
		channelName: "general",
		userId: "u1",
		username: "kisa",
		command: "music play",
		options: 'query:"lofi"',
		type: "chat",
		...extra
	};
}

function fakeTable(initial: Record<string, unknown> = {}) {
	const rows = new Map<string, unknown>(Object.entries(initial));
	const calls: string[] = [];
	let failPush = false;
	const table: SlashLogTable = {
		get: async <T>(key: string) => (rows.get(key) as T) ?? null,
		set: async (key: string, value: unknown) => {
			calls.push(`set ${key}`);
			rows.set(key, structuredClone(value));
		},
		push: async (key: string, ...values: unknown[]) => {
			calls.push(`push ${key} ${values.length}`);
			if (failPush) throw new Error("db down");
			rows.set(key, [...((rows.get(key) as unknown[]) ?? []), ...values]);
		},
		delete: async (key: string) => {
			calls.push(`delete ${key}`);
			rows.delete(key);
		}
	};
	return { table, rows, calls, setFailPush: (v: boolean) => (failPush = v) };
}

describe("keys", () => {
	test("hour and day keys are UTC and have no dot", () => {
		expect(slashLogHourKey(T, "0")).toBe("h2026110714_s0");
		expect(slashLogDayKey(T, "3")).toBe("d20261107_s3");
		expect(slashLogHourKey(Date.UTC(2026, 0, 1, 0, 0), "12")).toBe(
			"h2026010100_s12"
		);
		expect(slashLogHourKey(T, "0")).not.toContain(".");
	});
});

describe("day stats", () => {
	test("counting an entry", () => {
		const stats = emptyDayStats();
		addToDayStats(stats, entry(T));
		addToDayStats(stats, entry(T, { userId: "u2", username: "simn" }));
		expect(stats.total).toBe(2);
		expect(stats.hours[14]).toBe(2);
		expect(stats.commands["music play"]).toBe(2);
		expect(stats.users).toEqual({ u1: 1, u2: 1 });
		expect(stats.userNames.u2).toBe("simn");
	});

	test("a damaged stored document becomes a clean one", () => {
		const stats = normalizeDayStats({
			total: "x",
			hours: [1, "2"],
			commands: { ping: 3, bad: "4" },
			guildNames: { g: 5 }
		});
		expect(stats.total).toBe(0);
		expect(stats.hours.slice(0, 3)).toEqual([1, 0, 0]);
		expect(stats.hours).toHaveLength(24);
		expect(stats.commands).toEqual({ ping: 3 });
		expect(stats.guildNames).toEqual({});
		expect(normalizeDayStats(null).total).toBe(0);
	});
});

describe("retention", () => {
	test("only hours and days older than the retention are purged", () => {
		const keys = expiredKeys(T, "0", 48);
		const limit = T - SLASH_LOG_RETENTION_DAYS * DAY;

		expect(keys).toContain(slashLogHourKey(limit - HOUR, "0"));
		expect(keys).not.toContain(slashLogHourKey(limit, "0"));
		// The day holding the limit is still partly kept.
		expect(keys).not.toContain(slashLogDayKey(limit, "0"));
		expect(keys).toContain(slashLogDayKey(limit - DAY, "0"));
		expect(keys.filter((k) => k.startsWith("h"))).toHaveLength(48);
	});
});

describe("store", () => {
	test("entries are pushed into the row of their hour, in one batch", async () => {
		const db = fakeTable();
		const store = new SlashLogStore(
			async () => db.table,
			"0",
			() => T
		);

		store.add(entry(T));
		store.add(entry(T + 1000));
		store.add(entry(T + HOUR));
		await store.flushEntries();

		expect(db.rows.get("h2026110714_s0")).toHaveLength(2);
		expect(db.rows.get("h2026110715_s0")).toHaveLength(1);
		expect(db.calls.filter((c) => c.startsWith("push"))).toEqual([
			"push h2026110714_s0 2",
			"push h2026110715_s0 1"
		]);
		expect(db.rows.get("shards.0")).toBe(T);
	});

	test("a failed write keeps the entries for the next flush", async () => {
		const db = fakeTable();
		const store = new SlashLogStore(
			async () => db.table,
			"0",
			() => T
		);

		db.setFailPush(true);
		store.add(entry(T));
		await store.flushEntries();
		expect(db.rows.has("h2026110714_s0")).toBe(false);

		db.setFailPush(false);
		await store.flushEntries();
		expect(db.rows.get("h2026110714_s0")).toHaveLength(1);
	});

	test("day stats continue what an earlier run stored", async () => {
		const earlier = emptyDayStats();
		earlier.total = 5;
		earlier.commands.ping = 5;
		const db = fakeTable({ d20261107_s0: earlier });
		const store = new SlashLogStore(
			async () => db.table,
			"0",
			() => T
		);

		store.add(entry(T));
		store.add(entry(T, { command: "ping" }));
		await Bun.sleep(5);
		await store.forceFlush();

		const saved = db.rows.get("d20261107_s0") as typeof earlier;
		expect(saved.total).toBe(7);
		expect(saved.commands).toEqual({ ping: 6, "music play": 1 });
	});

	test("purge deletes only expired rows of its own shard", async () => {
		const db = fakeTable();
		const store = new SlashLogStore(
			async () => db.table,
			"2",
			() => T
		);
		await store.purge(2);
		const deleted = db.calls.filter((c) => c.startsWith("delete"));
		expect(deleted.length).toBeGreaterThan(0);
		expect(deleted.every((c) => c.endsWith("_s2"))).toBe(true);
	});
});

describe("legacy log file", () => {
	test("slash entries get their options split from the command", () => {
		const e = legacyEntry({
			timestamp: T,
			command: '/play query:"a b" volume:"5"',
			executorUsername: "kisa",
			guildId: "g",
			guildName: "G",
			channelId: "c",
			channelName: "x"
		});
		expect(e).toMatchObject({
			at: T,
			command: "play",
			options: 'query:"a b" volume:"5"',
			type: "chat",
			userId: ""
		});
	});

	test("prefix entries keep their arguments", () => {
		expect(
			legacyEntry({ timestamp: T, command: ".mod ban 123" })
		).toMatchObject({
			command: ".mod",
			options: "ban 123",
			type: "prefix"
		});
	});

	test("malformed entries are skipped", () => {
		expect(legacyEntry(null)).toBeNull();
		expect(legacyEntry({ command: "/x" })).toBeNull();
	});
});
