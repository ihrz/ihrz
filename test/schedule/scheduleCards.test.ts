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
import { MessageFlags } from "discord.js";

import {
	fence,
	scheduleBlock,
	scheduleReminderPayload
} from "../../src/core/modules/scheduleCards";

const client = {
	iHorizon_Emojis: { Schedule: "🗓️", Timer: "⏲️" },
	func: {
		displayBotName: {
			footerBuilder: async () => ({ text: "iHorizon", iconURL: "" })
		}
	}
} as never;
const lang = {
	schedule_reminder_title: "Reminder #${scheduleCode} is due!"
} as never;
const user = { id: "42", toString: () => "<@42>" } as never;
const entry = {
	title: "Title",
	description: "a ``` b",
	expired: 1_700_000_000_000
};

test("a fence typed in the text cannot close the block", () => {
	expect(fence("a ``` b")).toBe("```\na `​`` b\n```");
	expect(fence(undefined)).toBe("```\n\n```");
});

test("a list entry shows its code and both blocks on their own lines", () => {
	const block = scheduleBlock(client, "abc", entry);
	expect(block.startsWith("**#abc**")).toBe(true);
	expect(block).toContain("\n```\nTitle\n```\n```\na `​`` b\n```");
});

test("the reminder DM is a V2 card that pings its author only", async () => {
	const payload = await scheduleReminderPayload(
		client,
		lang,
		user,
		"abc",
		entry
	);
	expect(payload.flags).toContain(MessageFlags.IsComponentsV2);
	expect(payload.allowedMentions).toEqual({ users: ["42"] });
	expect("content" in payload).toBe(false);
	expect("embeds" in payload).toBe(false);

	const json = JSON.stringify(payload.components.map((c) => c.toJSON()));
	expect(json).toContain("Reminder #abc is due!");
	expect(json).toContain("<@42>");
	expect(json).toContain("Title");
});
