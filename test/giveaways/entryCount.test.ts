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

const { renderGiveawayDescription } =
	await import("../../src/core/modules/giveawaysManager.ts");
const fr = (await import("../../src/lang/fr-FR.ts")).default;
const en = (await import("../../src/lang/en-US.ts")).default;

const giveaway = {
	expireIn: new Date("2026-11-11T00:25:00Z"),
	hostedBy: "100000000000000000",
	winnerCount: 1
};

describe("giveaway description", () => {
	test("built from the data: the entry count is shown in French", () => {
		const text = renderGiveawayDescription(fr, giveaway, 1);
		expect(text).toContain("Participations : **1**");
		expect(text).toContain("<@100000000000000000>");
		expect(text).toContain("Gagnants : **1**");
		expect(text).not.toContain("${");
	});

	test("every language has the entry placeholder", async () => {
		for (const code of [
			"ar-EG",
			"de-DE",
			"en-US",
			"es-ES",
			"fr-FR",
			"fr-ME",
			"it-IT",
			"jp-JP",
			"pt-PT",
			"ru-RU"
		]) {
			const lang = (await import(`../../src/lang/${code}.ts`)).default;
			const text = renderGiveawayDescription(lang, giveaway, 42);
			expect(text, code).toContain("**42**");
			expect(text, code).not.toContain("${");
		}
	});

	test("the count follows entries and leaves", () => {
		expect(renderGiveawayDescription(en, giveaway, 5)).toContain(
			"Entries: **5**"
		);
		expect(renderGiveawayDescription(en, giveaway, 0)).toContain(
			"Entries: **0**"
		);
	});
});
