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
	componentsOf,
	computeNextRun,
	frequencyKey,
	normalizeComponents,
	planAutoBackup,
	reorderedPositions
} from "../../src/core/backup/src/components.ts";

const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d, 12);

function index(autos: number, manuals: number, guildId = "g1") {
	const out: Record<string, { auto: boolean; guildId: string }> = {};
	for (let i = 0; i < autos; i++)
		out[String(100 + i)] = { auto: true, guildId };
	for (let i = 0; i < manuals; i++)
		out[String(500 + i)] = { auto: false, guildId };
	return out;
}

describe("normalizeComponents", () => {
	test("drops unknown values and orders canonically", () => {
		expect(normalizeComponents(["bans", "nope", "roles"])).toEqual([
			"roles",
			"bans"
		]);
	});
	test("messages require channels", () => {
		expect(normalizeComponents(["messages"])).toEqual([
			"channels",
			"messages"
		]);
	});
});

describe("computeNextRun", () => {
	test("adds days and weeks", () => {
		expect(computeNextRun(utc(2026, 1, 1), { every: 3, unit: "day" })).toBe(
			utc(2026, 1, 4)
		);
		expect(
			computeNextRun(utc(2026, 1, 1), { every: 2, unit: "week" })
		).toBe(utc(2026, 1, 15));
	});
	test("three months is calendar based", () => {
		expect(
			computeNextRun(utc(2026, 1, 15), { every: 3, unit: "month" })
		).toBe(utc(2026, 4, 15));
	});
	test("clamps to the last day of a shorter month", () => {
		expect(
			computeNextRun(utc(2026, 1, 31), { every: 1, unit: "month" })
		).toBe(utc(2026, 2, 28));
	});
	test("crosses the year", () => {
		expect(
			computeNextRun(utc(2026, 11, 8), { every: 3, unit: "month" })
		).toBe(utc(2027, 2, 8));
	});
});

describe("frequencyKey", () => {
	test("finds presets", () => {
		expect(frequencyKey({ every: 3, unit: "month" })).toBe("3m");
		expect(frequencyKey({ every: 5, unit: "day" })).toBeNull();
	});
});

describe("planAutoBackup", () => {
	test("removes nothing under the limits", () => {
		expect(planAutoBackup(index(1, 1), "g1")).toEqual({
			allowed: true,
			remove: []
		});
	});
	test("rotates the oldest automatic backup past retention", () => {
		expect(planAutoBackup(index(5, 0), "g1")).toEqual({
			allowed: true,
			remove: ["100"]
		});
	});
	test("replaces an automatic backup when the total is full", () => {
		expect(planAutoBackup(index(2, 18), "g1")).toEqual({
			allowed: true,
			remove: ["100"]
		});
	});
	test("never removes a manual backup", () => {
		expect(planAutoBackup(index(0, 20), "g1")).toEqual({
			allowed: false,
			remove: []
		});
	});
	test("ignores automatic backups of other guilds", () => {
		expect(planAutoBackup(index(3, 17, "other"), "g1")).toEqual({
			allowed: false,
			remove: []
		});
	});
});

describe("componentsOf", () => {
	const empty = {
		roles: [],
		emojis: [],
		bans: [],
		members: [],
		channels: { categories: [], others: [] }
	};
	test("trusts the stored list", () => {
		expect(componentsOf({ ...empty, components: ["roles"] })).toEqual([
			"roles"
		]);
	});
	test("infers legacy backups from their content", () => {
		expect(componentsOf({ ...empty, roles: [{}] as never })).toEqual([
			"settings",
			"roles"
		]);
	});
});

describe("reorderedPositions", () => {
	const roles = [
		{ id: "bot", position: 5 },
		{ id: "a", position: 4 },
		{ id: "managed", position: 3 },
		{ id: "b", position: 2 },
		{ id: "c", position: 1 }
	];
	test("reuses only the slots of the restored roles", () => {
		expect(reorderedPositions(roles, ["c", "a", "b"])).toEqual([
			{ role: "c", position: 4 },
			{ role: "a", position: 2 },
			{ role: "b", position: 1 }
		]);
	});
	test("sends nothing when the order is already right", () => {
		expect(reorderedPositions(roles, ["a", "b", "c"])).toEqual([]);
	});
	test("ignores roles that no longer exist", () => {
		expect(reorderedPositions(roles, ["gone", "a"])).toEqual([]);
	});
});
