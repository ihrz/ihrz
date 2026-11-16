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
	isGlobalBlacklistBan,
	isServerBlacklistBan
} from "../../src/Interaction/HybridCommands/owner/unblacklist.ts";

const GLOBAL = "iHorizon Project Blacklist - phishing links";
const LOCAL = "Blacklist - spam";

describe("isGlobalBlacklistBan", () => {
	test("matches the /blacklist ban (stored reason)", () => {
		expect(isGlobalBlacklistBan(GLOBAL, GLOBAL)).toBe(true);
	});

	test("matches the join ban in any language", () => {
		for (const prefix of [
			"iHorizon Project Punishment - Blacklist | Reason: ",
			"iHorizon Project Punishement - Blacklist | Reason: ",
			"Sanction du projet iHorizon - Blacklist | Raison : ",
			"Наказание проекта iHorizon - Чёрный список | Причина: "
		]) {
			expect(isGlobalBlacklistBan(prefix + GLOBAL, GLOBAL)).toBe(true);
		}
	});

	test("matches bans left by a reason edited since", () => {
		expect(
			isGlobalBlacklistBan(
				"iHorizon Project Blacklist - old reason",
				GLOBAL
			)
		).toBe(true);
	});

	test("matches a pre-2024 entry without the prefix", () => {
		const old = "scam";
		expect(isGlobalBlacklistBan(old, old)).toBe(true);
		expect(
			isGlobalBlacklistBan(
				"iHorizon Project Punishement - Blacklist | Reason: " + old,
				old
			)
		).toBe(true);
	});

	test("leaves bans the server applied for another reason", () => {
		expect(isGlobalBlacklistBan("raid on 12/10", GLOBAL)).toBe(false);
		expect(isGlobalBlacklistBan(null, GLOBAL)).toBe(false);
		expect(isGlobalBlacklistBan(undefined, GLOBAL)).toBe(false);
		expect(isGlobalBlacklistBan("Banned by staff", "")).toBe(false);
		expect(isGlobalBlacklistBan("", "")).toBe(false);
	});

	test("leaves the server's own blacklist bans", () => {
		expect(isGlobalBlacklistBan(LOCAL, GLOBAL)).toBe(false);
		expect(
			isGlobalBlacklistBan("Blacklist | Reason: " + LOCAL, GLOBAL)
		).toBe(false);
	});
});

describe("isServerBlacklistBan", () => {
	test("matches the /blacklist ban and the join ban", () => {
		expect(isServerBlacklistBan(LOCAL, LOCAL)).toBe(true);
		expect(
			isServerBlacklistBan("Blacklist | Reason: " + LOCAL, LOCAL)
		).toBe(true);
		expect(
			isServerBlacklistBan("Blacklist | Raison : " + LOCAL, LOCAL)
		).toBe(true);
	});

	test("leaves global blacklist bans with the same reason text", () => {
		expect(
			isServerBlacklistBan("iHorizon Project Blacklist - spam", LOCAL)
		).toBe(false);
		expect(
			isServerBlacklistBan(
				"iHorizon Project Punishment - Blacklist | Reason: iHorizon Project Blacklist - spam",
				LOCAL
			)
		).toBe(false);
	});

	test("leaves unrelated bans", () => {
		expect(isServerBlacklistBan("raid", LOCAL)).toBe(false);
		expect(isServerBlacklistBan(null, LOCAL)).toBe(false);
	});
});
