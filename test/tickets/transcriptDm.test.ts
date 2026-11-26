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
import { AttachmentBuilder, MessageFlags } from "discord.js";

import { transcriptDmPayload } from "../../src/core/modules/ticketTranscripts.ts";

const channel = (icon: string | null) =>
	({
		id: "1234567890123456789",
		name: "ticket-member",
		guild: { name: "Server one", iconURL: () => icon }
	}) as any;

const build = (webUrl: string | null, icon: string | null = null) =>
	transcriptDmPayload({
		channel: channel(icon),
		title: "Ticket transcript",
		text: "Here is the transcript.",
		file: new AttachmentBuilder(Buffer.from("<html></html>"), {
			name: "1-transcript.html"
		}),
		webUrl,
		buttonLabel: "Transcript"
	});

describe("transcriptDmPayload", () => {
	test("a Components V2 message with the HTML file and the web link", () => {
		const payload = build(
			"https://transcript.ihorizon.org/1234567890123456789",
			"https://cdn.discordapp.com/icons/1/a.png"
		);
		expect(payload.flags).toBe(MessageFlags.IsComponentsV2);
		expect(payload.files[0].name).toBe("1-transcript.html");
		const json = JSON.stringify(payload.components[0].toJSON());
		expect(json).toContain("attachment://1-transcript.html");
		expect(json).toContain(
			"https://transcript.ihorizon.org/1234567890123456789"
		);
		expect(json).toContain("<#1234567890123456789>");
		expect(json).toContain("https://cdn.discordapp.com/icons/1/a.png");
	});

	test("no web transcript, no button", () => {
		const json = JSON.stringify(build(null).components[0].toJSON());
		expect(json).not.toContain("transcript.ihorizon.org");
		expect(json).toContain("attachment://1-transcript.html");
	});

	test("with a web transcript, the link only: no HTML file", () => {
		const payload = transcriptDmPayload({
			channel: channel(null),
			title: "Ticket transcript",
			text: "Here is the transcript.",
			file: null,
			webUrl: "https://transcript.ihorizon.org/1234567890123456789",
			buttonLabel: "Transcript"
		});
		expect(payload.files).toEqual([]);
		const json = JSON.stringify(payload.components[0].toJSON());
		expect(json).not.toContain("attachment://");
		expect(json).toContain(
			"https://transcript.ihorizon.org/1234567890123456789"
		);
	});
});
