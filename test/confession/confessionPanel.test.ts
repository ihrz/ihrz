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

import { describe, expect, mock, test } from "bun:test";
import { ButtonStyle, EmbedBuilder } from "discord.js";

import { readyTables } from "../readyTables.ts";

mock.module("../../src/Events/client/ready.js", () => readyTables());

const {
	confessionPanelPayload,
	isValidButtonEmoji,
	normalizeConfessionButton,
	parseCustomEmoji,
	refreshConfessionPanel
} = await import("../../src/core/modules/confessionManager.ts");

const ID = "123456789012345678";
const lang = {
	confession_panel_button_default_label: "Confess",
	confession_channel_panel_embed_desc: "Default description"
} as never;

const embeds: Record<string, unknown> = {
	"EMBED.RULES": { embedOwner: "1", embedSource: { title: "Rules" } }
};
const readMeta = async (key: string) => embeds[key] ?? null;

function fakeClient(config: unknown = null, botId = "999") {
	return {
		user: { id: botId },
		application: {
			emojis: { cache: new Map([["223456789012345678", {}]]) }
		},
		db: { get: async () => config },
		func: {
			getLanguageData: async () => lang,
			displayBotName: {
				footerBuilder: async () => ({
					text: "iHorizon",
					iconURL: "attachment://footer_icon.png"
				}),
				footerAttachmentBuilder: async () => ({
					attachment: "https://cdn/avatar.png",
					name: "footer_icon.png"
				})
			}
		}
	} as never;
}

function fakeGuild(channels: Record<string, unknown> = {}) {
	return {
		id: "42",
		emojis: { cache: new Map([[ID, {}]]) },
		channels: { cache: new Map(Object.entries(channels)) }
	} as never;
}

describe("isValidButtonEmoji", () => {
	test("unicode emojis, flags, keycaps and ZWJ sequences", () => {
		for (const e of ["😀", "❤️", "🇫🇷", "1️⃣", "👩‍💻", "👍🏽"])
			expect(isValidButtonEmoji(e)).toBe(true);
	});

	test("custom emojis written as <:name:id> / <a:name:id>", () => {
		expect(isValidButtonEmoji(`<:heart:${ID}>`)).toBe(true);
		expect(isValidButtonEmoji(`<a:dance_2:${ID}>`)).toBe(true);
		expect(parseCustomEmoji(`<a:dance_2:${ID}>`)).toEqual({
			animated: true,
			name: "dance_2",
			id: ID
		});
	});

	test("text, digits, broken custom emojis and long strings are refused", () => {
		for (const e of [
			"",
			"hi",
			"1",
			"#",
			"😀 hi",
			`<:x:${ID}>`,
			"<:heart:123>",
			`:heart:${ID}`,
			"😀".repeat(40),
			null,
			42
		])
			expect(isValidButtonEmoji(e)).toBe(false);
	});
});

describe("normalizeConfessionButton", () => {
	test("absent button: default label, no emoji, secondary", () => {
		expect(normalizeConfessionButton(undefined, "Confess")).toEqual({
			label: "Confess",
			emoji: null,
			style: "secondary"
		});
	});

	test("label trimmed, empty or too long falls back to the default", () => {
		expect(
			normalizeConfessionButton({ label: "  Speak  " }, "Confess").label
		).toBe("Speak");
		expect(
			normalizeConfessionButton({ label: "   " }, "Confess").label
		).toBe("Confess");
		expect(
			normalizeConfessionButton({ label: "x".repeat(81) }, "Confess")
				.label
		).toBe("Confess");
		expect(
			normalizeConfessionButton({ label: "x".repeat(80) }, "Confess")
				.label
		).toBe("x".repeat(80));
	});

	test("the four styles are kept, anything else is secondary", () => {
		for (const style of [
			"primary",
			"secondary",
			"success",
			"danger"
		] as const)
			expect(normalizeConfessionButton({ style }, "C").style).toBe(style);
		expect(
			normalizeConfessionButton({ style: "link" as never }, "C").style
		).toBe("secondary");
	});

	test("a custom emoji the bot cannot use is dropped, a usable one is kept", () => {
		const emoji = `<:heart:${ID}>`;
		expect(normalizeConfessionButton({ emoji }, "C").emoji).toBeNull();
		expect(
			normalizeConfessionButton({ emoji }, "C", (id) => id === ID).emoji
		).toEqual({ animated: false, name: "heart", id: ID });
		expect(normalizeConfessionButton({ emoji: "🔥" }, "C").emoji).toBe(
			"🔥"
		);
		expect(
			normalizeConfessionButton({ emoji: "nope" }, "C").emoji
		).toBeNull();
	});
});

describe("confessionPanelPayload", () => {
	const button = (p: Awaited<ReturnType<typeof confessionPanelPayload>>) =>
		p.components[0].components[0].toJSON() as {
			label: string;
			style: number;
			custom_id: string;
			emoji?: { id?: string; name?: string };
		};

	test("default embed and default button", async () => {
		const payload = await confessionPanelPayload(
			fakeClient(),
			fakeGuild(),
			null,
			lang,
			readMeta
		);
		const embed = (payload.embeds[0] as EmbedBuilder).toJSON();
		expect(embed.description).toBe("Default description");
		expect(embed.footer?.text).toBe("iHorizon");
		expect(payload.files).toHaveLength(1);
		expect(button(payload)).toMatchObject({
			label: "Confess",
			style: ButtonStyle.Secondary,
			custom_id: "new-confession-button"
		});
		expect(button(payload).emoji).toBeUndefined();
	});

	test("embed code and customised button", async () => {
		const payload = await confessionPanelPayload(
			fakeClient(),
			fakeGuild(),
			{
				embedId: "RULES",
				button: {
					label: "Tell us",
					emoji: `<a:wave:${ID}>`,
					style: "danger"
				}
			},
			lang,
			readMeta
		);
		expect(payload.embeds).toEqual([{ title: "Rules" }]);
		expect(payload.files).toEqual([]);
		expect(button(payload)).toMatchObject({
			label: "Tell us",
			style: ButtonStyle.Danger,
			emoji: { id: ID, name: "wave" }
		});
	});

	test("an application emoji is usable, an unknown one is dropped", async () => {
		const app = await confessionPanelPayload(
			fakeClient(),
			fakeGuild(),
			{ button: { emoji: "<:bot:223456789012345678>" } },
			lang,
			readMeta
		);
		expect(button(app).emoji?.id).toBe("223456789012345678");
		const unknown = await confessionPanelPayload(
			fakeClient(),
			fakeGuild(),
			{
				button: {
					emoji: "<:gone:323456789012345678>",
					style: "success"
				}
			},
			lang,
			readMeta
		);
		expect(button(unknown).emoji).toBeUndefined();
		expect(button(unknown).style).toBe(ButtonStyle.Success);
	});

	test("deleted or invalid embed code: the default embed", async () => {
		for (const embedId of ["GONE", "RULES.embedSource", ""]) {
			const payload = await confessionPanelPayload(
				fakeClient(),
				fakeGuild(),
				{ embedId },
				lang,
				readMeta
			);
			expect(
				(payload.embeds[0] as EmbedBuilder).toJSON().description
			).toBe("Default description");
		}
	});
});

describe("refreshConfessionPanel", () => {
	const panel = { panel: { channelId: "10", messageId: "20" } };

	test("no panel stored: false", async () => {
		expect(
			await refreshConfessionPanel(fakeClient({}), fakeGuild(), readMeta)
		).toBe(false);
	});

	test("deleted panel message: false, never throws", async () => {
		const channel = {
			isTextBased: () => true,
			messages: {
				fetch: async () => {
					throw new Error("Unknown Message");
				}
			}
		};
		expect(
			await refreshConfessionPanel(
				fakeClient(panel),
				fakeGuild({ "10": channel }),
				readMeta
			)
		).toBe(false);
	});

	test("deleted channel: false", async () => {
		expect(
			await refreshConfessionPanel(
				fakeClient(panel),
				fakeGuild(),
				readMeta
			)
		).toBe(false);
	});

	test("a message that is not the bot's is left alone", async () => {
		let edited = false;
		const channel = {
			isTextBased: () => true,
			messages: {
				fetch: async () => ({
					author: { id: "someone" },
					edit: async () => {
						edited = true;
					}
				})
			}
		};
		expect(
			await refreshConfessionPanel(
				fakeClient(panel),
				fakeGuild({ "10": channel }),
				readMeta
			)
		).toBe(false);
		expect(edited).toBe(false);
	});

	test("the bot's panel is edited in place with the stored look", async () => {
		let sent: { components?: { toJSON(): unknown }[] } | null = null;
		const channel = {
			isTextBased: () => true,
			messages: {
				fetch: async () => ({
					author: { id: "999" },
					edit: async (options: typeof sent) => {
						sent = options;
					}
				})
			}
		};
		expect(
			await refreshConfessionPanel(
				fakeClient({
					...panel,
					button: { label: "Go", style: "success" }
				}),
				fakeGuild({ "10": channel }),
				readMeta
			)
		).toBe(true);
		const row = sent!.components![0].toJSON() as {
			components: { label: string; style: number }[];
		};
		expect(row.components[0]).toMatchObject({
			label: "Go",
			style: ButtonStyle.Success
		});
	});
});
