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

import { TextChannel } from "discord.js";

import { event } from "../../src/Events/starboard/onNewReact.ts";

test("concurrent stars give one post, and its count ends up right", async () => {
	const store = new Map<string, unknown>([
		[
			"g.GUILD.STARBOARD",
			{ enabled: "yes", channel: "board", threshold: 2 }
		]
	]);
	const sent: string[] = [];
	const edits: string[] = [];
	let releaseSend!: () => void;
	const sendGate = new Promise<void>((resolve) => (releaseSend = resolve));

	const posted = {
		id: "post",
		edit: async (o: any) => edits.push(o.content)
	};
	const board = Object.assign(Object.create(TextChannel.prototype), {
		send: async (o: any) => {
			sent.push(o.content);
			await sendGate;
			return { ...posted, startThread: async () => null };
		},
		messages: { fetch: async () => posted }
	});

	const guild = {
		id: "g",
		channels: { cache: new Map([["board", board]]) }
	};
	const message: any = {
		id: "m",
		channelId: "c",
		guild,
		partial: false,
		author: {
			bot: false,
			tag: "a",
			username: "a",
			id: "a",
			displayAvatarURL: () => ""
		},
		content: "hello",
		createdAt: new Date(0),
		attachments: { first: () => undefined }
	};
	const reaction: any = {
		partial: false,
		emoji: { name: "⭐" },
		count: 2,
		message
	};
	const client: any = {
		db: {
			get: async (key: string) => store.get(key) ?? null,
			set: async (key: string, value: unknown) => {
				store.set(key, value);
			}
		},
		func: {
			getLanguageData: async () => new Proxy({}, { get: () => "x" }),
			getMessageURL: () => "https://discord.com/channels/g/c/m",
			displayBotName: {
				footerBuilder: async () => ({ text: "bot" }),
				footerAttachmentBuilder: async () => ({
					attachment: Buffer.alloc(0),
					name: "f.png"
				})
			}
		}
	};
	const user: any = { bot: false };

	const first = event.run(client, reaction, user);
	await Bun.sleep(10);

	// Two more stars while the first post is still being sent.
	reaction.count = 3;
	await event.run(client, reaction, user);
	reaction.count = 4;
	await event.run(client, reaction, user);

	releaseSend();
	await first;
	await Bun.sleep(20);

	expect(sent).toEqual(["⭐ **2** | <#c>"]);
	expect(edits.at(-1)).toBe("⭐ **4** | <#c>");
	expect((store.get("g.GUILD.STARBOARD_DATA") as unknown[]).length).toBe(1);
});
