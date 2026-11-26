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

import emojis from "../../src/files/emojis.json";
import { sendTicketLog } from "../../src/core/modules/ticketsManager.ts";

const fakeGuild = (sent: any[], logs: string | null = "500") =>
	({
		id: "9",
		client: {
			iHorizon_Emojis: emojis,
			db: { get: async () => logs },
			func: {
				displayBotName: {
					footerBuilder: async () => ({
						text: "iHorizon",
						iconURL: ""
					})
				}
			}
		},
		channels: {
			cache: new Map([
				[
					"500",
					{
						isSendable: () => true,
						send: async (p: any) => sent.push(p)
					}
				]
			])
		}
	}) as any;

describe("ticket log", () => {
	test("a Components V2 card that pings nobody", async () => {
		const sent: any[] = [];
		await sendTicketLog(fakeGuild(sent), {
			kind: "closed",
			title: "Ticket closed",
			description: "<@1> closed <#2>",
			files: [
				new AttachmentBuilder(Buffer.from("x"), {
					name: "9-transcript.html"
				})
			],
			link: { url: "https://transcript.ihorizon.org/2", label: "Transcript" }
		});
		expect(sent).toHaveLength(1);
		const [payload] = sent;
		expect(payload.flags).toBe(MessageFlags.IsComponentsV2);
		expect(payload.allowedMentions).toEqual({ parse: [] });
		expect(payload.embeds).toBeUndefined();
		const json = JSON.stringify(payload.components[0].toJSON());
		expect(json).toContain("Ticket closed");
		expect(json).toContain("<@1> closed <#2>");
		expect(json).toContain("attachment://9-transcript.html");
		expect(json).toContain("https://transcript.ihorizon.org/2");
		expect(json).toContain(emojis.Lock);
	});

	test("no log channel, nothing sent", async () => {
		const sent: any[] = [];
		await sendTicketLog(fakeGuild(sent, null), {
			kind: "created",
			title: "t",
			description: "d"
		});
		expect(sent).toHaveLength(0);
	});
});
