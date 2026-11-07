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

import { stripChoiceDuration } from "../../src/core/functions/musicPlay.ts";

test.each([
	["Dégun - Lagui (2:58)", "Dégun - Lagui"],
	["Dégun - Lagui (2:58", "Dégun - Lagui"],
	["Dégun - Lagui (2:", "Dégun - Lagui"],
	["Long mix - DJ (1:02:33)", "Long mix - DJ"]
])("the suggestion duration is removed from %j", (query, expected) => {
	expect(stripChoiceDuration(query)).toBe(expected);
});

test.each([
	"Song (2)",
	"Song (Live)",
	"Song (feat. X)",
	"(2:58)",
	"lofi 24/7",
	"https://www.deezer.com/track/1"
])("%j is kept as typed", (query) => {
	expect(stripChoiceDuration(query)).toBe(query);
});
