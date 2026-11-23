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

(globalThis as { client?: unknown }).client ??= {
	user: { id: "bot" },
	func: {}
};
// Languages are cached once the bot's emojis are known (after `ready`).
(
	globalThis as { client: { iHorizon_Emojis?: object } }
).client.iHorizon_Emojis ??= {};

const { generateCustomMessagePreview } =
	await import("../../src/core/functions/method/messages.ts");
const { default: getLanguageDataByCode } =
	await import("../../src/core/functions/getLanguageDataByCode.ts");

const user = {
	username: "newbie",
	createdAt: new Date(0),
	toString: () => "<@1>"
} as never;
const guild = { name: "Guild", memberCount: 3 } as never;

const TEXT = "{inviterUsername}|{inviterMention}|{invitesCount}";

test("unknown inviter: translated word and a count of 0, never placeholders", async () => {
	await getLanguageDataByCode("fr-FR");
	const out = generateCustomMessagePreview(TEXT, {
		user,
		guild,
		guildLocal: "fr-FR"
	});
	expect(out).toBe("Inconnu|Inconnu|0");
	expect(out).not.toContain("unknow_user");
	expect(out).not.toContain("1337");
});

test("unknown inviter with a Discord locale (tickets) uses its language", async () => {
	await getLanguageDataByCode("de-DE");
	expect(
		generateCustomMessagePreview(TEXT, { user, guild, guildLocal: "de" })
	).toBe("Unbekannt|Unbekannt|0");
});

test("unknown inviter with an unknown locale falls back to English", async () => {
	await getLanguageDataByCode("en-US");
	expect(
		generateCustomMessagePreview(TEXT, { user, guild, guildLocal: "xx" })
	).toBe("Unknown|Unknown|0");
});

test("known inviter is used as is", () => {
	expect(
		generateCustomMessagePreview(TEXT, {
			user,
			guild,
			guildLocal: "en-US",
			inviter: {
				user: { username: "host", mention: "<@2>" },
				invitesAmount: 0
			}
		})
	).toBe("host|<@2>|0");
});
