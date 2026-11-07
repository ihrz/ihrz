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

import { isDiscordErrorCode } from "../../src/core/modules/tempbanManager.ts";

test("isDiscordErrorCode matches the Discord API error code", () => {
	expect(isDiscordErrorCode({ code: 10007 }, 10007)).toBe(true);
	expect(isDiscordErrorCode({ code: 10026 }, 10007)).toBe(false);
});

test("isDiscordErrorCode rejects values without a code", () => {
	expect(isDiscordErrorCode(null, 10007)).toBe(false);
	expect(isDiscordErrorCode(undefined, 10007)).toBe(false);
	expect(isDiscordErrorCode("10007", 10007)).toBe(false);
	expect(isDiscordErrorCode(new Error("boom"), 10007)).toBe(false);
});
