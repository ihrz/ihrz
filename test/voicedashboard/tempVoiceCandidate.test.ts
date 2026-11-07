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
import type { GuildMember } from "discord.js";

import { isTempVoiceCandidate } from "../../src/core/functions/tempVoiceCandidate";

const member = (bot: boolean) => ({ user: { bot } }) as unknown as GuildMember;

test("a person joining the hub gets a temporary channel", () => {
	expect(isTempVoiceCandidate(member(false))).toBe(true);
});

test("a bot, iHorizon included, never does", () => {
	expect(isTempVoiceCandidate(member(true))).toBe(false);
});

test("an unknown member is not a candidate", () => {
	expect(isTempVoiceCandidate(null)).toBe(false);
	expect(isTempVoiceCandidate(undefined)).toBe(false);
});
