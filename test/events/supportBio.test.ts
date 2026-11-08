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

import { bioMatches } from "../../src/Events/utils/supportModule.ts";

test("matches the configured text or the vanity, ignoring case", () => {
	expect(bioMatches("Join MyServer now", "myserver", null)).toBe(true);
	expect(bioMatches("discord.gg/Abc", "other", "abc")).toBe(true);
});

test("an empty input matches nothing", () => {
	expect(bioMatches("any status", "", null)).toBe(false);
	expect(bioMatches("any status", "   ", null)).toBe(false);
});

test("a guild without vanity does not match the word null", () => {
	expect(bioMatches("null and void", "other", null)).toBe(false);
});

test("no status matches nothing", () => {
	expect(bioMatches(null, "x", "y")).toBe(false);
});
