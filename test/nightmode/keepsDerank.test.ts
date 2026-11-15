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

import { keepsDerank } from "../../src/core/modules/nightModeManager.ts";

const human = { id: "r1", managed: false };
const bot = (botId: string) => ({ id: "r-" + botId, managed: true, tags: { botId } });

describe("night mode: which Administrator roles are taken away", () => {
	test("member roles always", () => {
		expect(keepsDerank(human, undefined)).toBe(true);
		expect(keepsDerank(human, { derankBot: false })).toBe(true);
	});
	test("bot roles only when 'derank bots' is on", () => {
		expect(keepsDerank(bot("b1"), { derankBot: false })).toBe(false);
		expect(keepsDerank(bot("b1"), undefined)).toBe(false);
		expect(keepsDerank(bot("b1"), { derankBot: true })).toBe(true);
	});
	test("allowed bots (user ids from /nightmode) keep theirs", () => {
		expect(keepsDerank(bot("b1"), { derankBot: true, wlBots: ["b1"] })).toBe(false);
		expect(keepsDerank(bot("b2"), { derankBot: true, wlBots: ["b1"] })).toBe(true);
	});
});
