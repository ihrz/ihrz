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
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	ComponentType,
	EmbedBuilder,
	MessageFlags
} from "discord.js";

import emojis from "../../src/files/emojis.json";
import enUS from "../../src/lang/en-US.ts";
import {
	LOG_ACCENT,
	logCardPayload,
	safeAttachmentName,
	sendLogCard
} from "../../src/core/modules/logCard.ts";
import { deletedMessageLog } from "../../src/Events/logs/messageDeleteLogs.ts";
import { editedMessageLog } from "../../src/Events/logs/messageUpdateLogs.ts";

const fakeChannel = (sent: any[], sendable = true) =>
	({
		id: "500",
		guildId: "9",
		client: {
			func: {
				displayBotName: {
					footerBuilder: async () => ({
						text: "iHorizon",
						iconURL: ""
					})
				}
			}
		},
		isSendable: () => sendable,
		send: async (p: any) => {
			sent.push(p);
			return { id: "m" };
		}
	}) as any;

const author = {
	id: "1",
	username: "alice",
	displayAvatarURL: () => "https://cdn.discordapp.com/avatars/1/a.png"
} as any;

const file = (name: string) =>
	new AttachmentBuilder(Buffer.from("x"), { name });

/** Every component of the card, flattened (type + JSON). */
function flatten(payload: any): any[] {
	const out: any[] = [];
	const walk = (c: any) => {
		out.push(c);
		for (const child of c.components ?? []) walk(child);
		if (c.accessory) walk(c.accessory);
	};
	for (const c of payload.components) walk(c.toJSON());
	return out;
}

describe("log card", () => {
	test("V2 flag, no embeds, no pings, time line instead of a timestamp", () => {
		const payload = logCardPayload(
			{
				kind: "danger",
				title: "Member banned",
				emoji: emojis.Ban_Hammer,
				description: "<@2> **banned** <@3>",
				thumbnail: author.displayAvatarURL(),
				timestamp: 1_700_000_000_000
			},
			"iHorizon"
		);
		expect(payload.flags).toEqual([MessageFlags.IsComponentsV2]);
		expect(payload.allowedMentions).toEqual({ parse: [] });
		expect((payload as any).embeds).toBeUndefined();
		expect((payload as any).content).toBeUndefined();
		const card = payload.components[0].toJSON() as any;
		expect(card.accent_color).toBe(LOG_ACCENT.danger);
		const json = JSON.stringify(card);
		expect(json).toContain(`## ${emojis.Ban_Hammer} Member banned`);
		expect(json).toContain("<t:1700000000:F>");
		expect(json).toContain("iHorizon");
		const thumb = flatten(payload).find(
			(c) => c.type === ComponentType.Thumbnail
		);
		expect(thumb.media.url).toBe(author.displayAvatarURL());
	});

	test("images go to a gallery, other files to file components", () => {
		const payload = logCardPayload(
			{
				kind: "danger",
				title: "x",
				attachments: [
					{ file: file("0_cat.png"), image: true },
					{ file: file("1_notes.txt") }
				]
			},
			null
		);
		expect(payload.files.map((f) => f.name)).toEqual([
			"0_cat.png",
			"1_notes.txt"
		]);
		const all = flatten(payload);
		const gallery = all.find((c) => c.type === ComponentType.MediaGallery);
		expect(gallery.items.map((i: any) => i.media.url)).toEqual([
			"attachment://0_cat.png"
		]);
		const files = all.filter((c) => c.type === ComponentType.File);
		expect(files.map((f) => f.file.url)).toEqual([
			"attachment://1_notes.txt"
		]);
	});

	test("buttons stay inside the card", () => {
		const payload = logCardPayload(
			{
				kind: "info",
				title: "New confession: abc",
				rows: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setStyle(ButtonStyle.Secondary)
							.setLabel("User Profile")
							.setCustomId("confessionauthor%1")
					)
				]
			},
			null
		);
		const button = flatten(payload).find(
			(c) => c.type === ComponentType.Button
		);
		expect(button.custom_id).toBe("confessionauthor%1");
	});

	test("attachment names are safe and unique", () => {
		expect(safeAttachmentName("my photo (1).png", 0)).toBe(
			"0_my_photo_1_.png"
		);
		expect(safeAttachmentName("a.png", 1)).not.toBe(
			safeAttachmentName("a.png", 2)
		);
	});

	test("sendLogCard sends once, with the guild's bot name", async () => {
		const sent: any[] = [];
		await sendLogCard(fakeChannel(sent), { kind: "info", title: "x" });
		expect(sent).toHaveLength(1);
		expect(JSON.stringify(sent[0].components[0].toJSON())).toContain(
			"iHorizon"
		);
	});

	test("sendLogCard ignores channels it can't post in, never throws", async () => {
		const sent: any[] = [];
		expect(
			await sendLogCard(fakeChannel(sent, false), {
				kind: "info",
				title: "x"
			})
		).toBeNull();
		expect(await sendLogCard(undefined, { kind: "info", title: "x" })).toBe(
			null
		);
		const broken = {
			...fakeChannel(sent),
			send: async () => {
				throw new Error("Missing Access");
			}
		};
		expect(await sendLogCard(broken, { kind: "info", title: "x" })).toBe(
			null
		);
		expect(sent).toHaveLength(0);
	});
});

describe("message logs", () => {
	test("deleted message: content, attachments in the card, embeds aside", () => {
		const { card, embeds } = deletedMessageLog(
			{
				author,
				channelId: "77",
				content: "hello @everyone",
				embeds: [new EmbedBuilder().setTitle("Preview").toJSON()]
			} as any,
			enUS,
			emojis,
			[
				{ file: file("0_shot.png"), image: true },
				{ file: file("1_report.pdf") }
			]
		);
		expect(embeds).toHaveLength(1);
		expect(embeds[0].data.title).toBe("Preview");

		const payload = logCardPayload(card, "iHorizon");
		expect((payload as any).embeds).toBeUndefined();
		expect(payload.allowedMentions).toEqual({ parse: [] });
		const json = JSON.stringify(payload.components[0].toJSON());
		expect(json).toContain(enUS.logs_message_delete_title);
		expect(json).toContain("hello @everyone");
		expect(json).toContain("<#77>");
		expect(json).toContain("attachment://0_shot.png");
		expect(json).toContain("attachment://1_report.pdf");
		expect(payload.files).toHaveLength(2);
	});

	test("edited message: before and after as two blocks", () => {
		const card = editedMessageLog(
			{ guildId: "9", channelId: "77", id: "88", content: "old text" },
			{ author, content: "new text" } as any,
			enUS,
			emojis
		);
		const texts = flatten(logCardPayload(card, null))
			.filter((c) => c.type === ComponentType.TextDisplay)
			.map((c) => c.content);
		const before = texts.find((t) =>
			t.startsWith(`**${enUS.event_srvLogs_messageUpdate_footer_1}**`)
		);
		const after = texts.find((t) =>
			t.startsWith(`**${enUS.event_srvLogs_messageUpdate_footer_2}**`)
		);
		expect(before).toContain("old text");
		expect(after).toContain("new text");
		expect(texts.join("\n")).toContain(
			"https://discord.com/channels/9/77/88"
		);
	});
});
