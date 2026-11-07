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

import { fillEmbedText } from "../../src/core/modules/ticketsManager.ts";

const fill = (text: string) =>
	text.replaceAll("{guildName}", 'My "Great" \\ Guild');

test("fillEmbedText fills the text fields without breaking on quotes", () => {
	const result = fillEmbedText(
		{
			title: "Welcome to {guildName}",
			description: "{guildName}",
			color: 123,
			footer: { text: "{guildName}" },
			author: { name: "{guildName}" },
			fields: [{ name: "{guildName}", value: "v {guildName}" }]
		},
		fill
	);

	expect(result?.title).toBe('Welcome to My "Great" \\ Guild');
	expect(result?.description).toBe('My "Great" \\ Guild');
	expect(result?.footer?.text).toBe('My "Great" \\ Guild');
	expect(result?.author?.name).toBe('My "Great" \\ Guild');
	expect(result?.fields?.[0]).toEqual({
		name: 'My "Great" \\ Guild',
		value: 'v My "Great" \\ Guild'
	});
	expect(result?.color).toBe(123);
});

test("fillEmbedText returns null for a missing embed and does not mutate", () => {
	expect(fillEmbedText(null, fill)).toBeNull();
	expect(fillEmbedText(undefined, fill)).toBeNull();

	const source = { title: "{guildName}" };
	fillEmbedText(source, fill);
	expect(source.title).toBe("{guildName}");
});
