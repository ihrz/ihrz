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

// Regression tests for the iHorizon logs channel and two log cards:
// - ihorizon_logs() posted a classic embed to the first channel named "ihorizon-logs", even a public one (the
//   unwarn log of moderationOps went there too): it now posts a V2 log card, only where @everyone can't look;
// - the honeypot log was a classic embed;
// - the anti-spam log said "has **sanction** @user" with an untranslated "mute"/"kick"/"ban" in the title;
// - /setlogs "Delete all settings" logged a deletion before checking anything existed.

import { describe, expect, test } from "bun:test";
import {
	type Client,
	Collection,
	type Guild,
	type Message,
	MessageFlags,
	PermissionFlagsBits,
	PermissionsBitField
} from "discord.js";

import ihorizonLogs from "../../src/core/functions/ihorizon_logs.ts";
import hasIhorizonLogs from "../../src/core/functions/hasIhorizonLogs.ts";
import { sendUnwarnLog } from "../../src/core/modules/moderationOps.ts";
import { honeypotLogCard } from "../../src/core/modules/honeypotManager.ts";
import { antiSpamLogText } from "../../src/core/modules/antiSpamEngine.ts";
import { buildLogCard } from "../../src/core/modules/logCard.ts";
import { command as setlogs } from "../../src/Interaction/HybridCommands/guildconfig/setlogschannel.ts";
import en from "../../src/lang/en-US.ts";

const EVERYONE = { id: "g" };

type LogTarget = Parameters<typeof ihorizonLogs>[0];
type LogEntry = Parameters<typeof ihorizonLogs>[1];

// The parts of a sent message the tests read.
type Payload = {
	embeds?: unknown;
	flags?: unknown[];
	allowedMentions?: unknown;
	components: { toJSON(): unknown }[];
};

function makeGuild(channels: { name: string; public: boolean }[]) {
	const sent: Record<string, Payload[]> = {};
	// Typed loosely: the tests plug more functions in.
	const client: {
		iHorizon_Emojis: Record<string, string>;
		func: Record<string, unknown>;
		db: { get: () => Promise<null> };
	} = {
		iHorizon_Emojis: { Logs: "<:Logs:1>" },
		func: {
			displayBotName: {
				footerBuilder: async () => ({ text: "iHorizon" })
			},
			hasIhorizonLogs: (g: Guild) => hasIhorizonLogs(g)
		},
		db: { get: async () => null }
	};
	const guild = {
		id: "g",
		client,
		roles: { everyone: EVERYONE },
		channels: { cache: new Collection<string, unknown>() }
	};
	channels.forEach((c, i) => {
		const id = String(i + 1);
		sent[c.name] = [];
		guild.channels.cache.set(id, {
			id,
			name: c.name,
			guild,
			guildId: "g",
			client,
			isTextBased: () => true,
			isSendable: () => true,
			permissionsFor: () =>
				new PermissionsBitField(
					c.public ? [PermissionFlagsBits.ViewChannel] : []
				),
			send: async (payload: Payload) => {
				sent[c.name].push(payload);
				return payload;
			}
		});
	});
	return { guild: guild as unknown as Guild, client, sent };
}

function texts(payload: Payload): string {
	return JSON.stringify(payload.components.map((c) => c.toJSON()));
}

describe("ihorizon_logs", () => {
	test("posts a V2 log card in a private ihorizon-logs channel, without pings", async () => {
		const { guild, sent } = makeGuild([
			{ name: "ihorizon-logs", public: false }
		]);
		await ihorizonLogs(
			{ guild },
			{ title: "Title", description: "<@1> did it" }
		);

		expect(sent["ihorizon-logs"]).toHaveLength(1);
		const payload = sent["ihorizon-logs"][0];
		expect(payload.embeds).toBeUndefined();
		expect(payload.flags).toContain(MessageFlags.IsComponentsV2);
		expect(payload.allowedMentions).toEqual({ parse: [] });
		const json = texts(payload);
		expect(json).toContain("## <:Logs:1> Title");
		expect(json).toContain("<@1> did it");
		expect(json).toMatch(/<t:\d+:F>/);
	});

	test("skips a channel @everyone can see", async () => {
		const { guild, sent } = makeGuild([
			{ name: "ihorizon-logs", public: true }
		]);
		await ihorizonLogs({ guild }, { title: "T", description: "D" });
		expect(sent["ihorizon-logs"]).toHaveLength(0);
		expect(hasIhorizonLogs(guild)).toBe(false);
	});

	test("picks the private one when a public one comes first", async () => {
		const { guild, sent } = makeGuild([
			{ name: "ihorizon-logs-public", public: true },
			{ name: "ihorizon-logs", public: false }
		]);
		expect(hasIhorizonLogs(guild)).toBe(true);
		await ihorizonLogs({ guild }, { title: "T", description: "D" });
		expect(sent["ihorizon-logs-public"]).toHaveLength(0);
		expect(sent["ihorizon-logs"]).toHaveLength(1);
	});

	test("no guild, no channel: nothing happens", async () => {
		await ihorizonLogs({ guild: null }, { title: "T", description: "D" });
		const { guild, sent } = makeGuild([{ name: "general", public: true }]);
		await ihorizonLogs({ guild }, { title: "T", description: "D" });
		expect(sent.general).toHaveLength(0);
	});
});

describe("unwarn log", () => {
	const removed = {
		id: "w1",
		reason: "spam",
		authorID: "2",
		timestamp: 0
	};

	test("a public ihorizon-logs channel never gets it (private mods channel does)", async () => {
		const { guild, client, sent } = makeGuild([
			{ name: "ihorizon-logs", public: true },
			{ name: "mods", public: false }
		]);
		client.func.ihorizon_logs = (i: LogTarget, e: LogEntry) =>
			ihorizonLogs(i, e);
		client.iHorizon_Emojis = new Proxy({}, { get: () => "" });
		await sendUnwarnLog(guild, "<@2>", "<@3>", removed, en);
		expect(sent["ihorizon-logs"]).toHaveLength(0);
		expect(sent.mods).toHaveLength(1);
	});

	test("a private ihorizon-logs channel gets it", async () => {
		const { guild, client, sent } = makeGuild([
			{ name: "ihorizon-logs", public: false },
			{ name: "mods", public: false }
		]);
		client.func.ihorizon_logs = (i: LogTarget, e: LogEntry) =>
			ihorizonLogs(i, e);
		await sendUnwarnLog(guild, "<@2>", "<@3>", removed, en);
		expect(sent["ihorizon-logs"]).toHaveLength(1);
		expect(sent.mods).toHaveLength(0);
	});
});

describe("honeypot log", () => {
	test("is a V2 log card with every detail of the trigger", () => {
		const attachments = new Collection<string, unknown>([
			[
				"a",
				{
					url: "https://cdn.discordapp.com/x.png",
					contentType: "image/png",
					width: 10
				}
			]
		]);
		const message = {
			client: { iHorizon_Emojis: { Honey_Pot: "<:Honey:1>" } },
			author: {
				id: "42",
				toString: () => "<@42>",
				displayAvatarURL: () => "https://cdn/avatar.png"
			},
			channel: { toString: () => "<#7>" },
			content: "free nitro",
			embeds: [],
			attachments,
			stickers: new Collection(),
			createdTimestamp: 1_700_000_000_000
		} as unknown as Message;
		const card = honeypotLogCard(message, en, 3, false, "ban", 2);
		expect(card.kind).toBe("danger");
		const json = JSON.stringify(buildLogCard(card, "iHorizon").toJSON());
		expect(json).toContain(
			en.honeypot_log_title.replace(
				"${action}",
				en.honeypot_log_action_ban
			)
		);
		expect(json).toContain("<@42>");
		expect(json).toContain("<#7>");
		expect(json).toContain("free nitro");
		expect(json).toContain(en.honeypot_log_dm_closed);
		expect(json).toContain("https://cdn.discordapp.com/x.png");
		expect(json).toContain("<t:1700000000:F>");
	});
});

describe("anti-spam log", () => {
	test("names the action that was applied, translated", () => {
		for (const [action, word] of [
			["mute", "muted"],
			["kick", "kicked"],
			["ban", "banned"]
		]) {
			const { title, description } = antiSpamLogText(
				en,
				action,
				"<@1>",
				"<@2>"
			);
			expect(title).toBe(`[AntiSpam] New ${action}`);
			expect(description).toBe(`<@1> has **${word}** <@2>`);
			expect(description).not.toContain("anction");
		}
	});

	test("every language has the three actions", async () => {
		const { readdirSync } = await import("node:fs");
		for (const file of readdirSync("src/lang").filter((f) =>
			f.endsWith(".ts")
		)) {
			const lang = (await import(`../../src/lang/${file}`)).default;
			for (const a of ["mute", "kick", "ban"]) {
				expect(lang[`logs_antispam_title_${a}`]).toBeTruthy();
				expect(lang[`logs_antispam_desc_${a}`]).toContain("${user}");
			}
		}
	});
});

describe("/setlogs Delete all settings", () => {
	function run(stored: unknown) {
		const calls: string[] = [];
		const client = {
			user: { id: "1" },
			db: {
				get: async () => stored,
				delete: async () => {
					calls.push("delete");
				}
			},
			func: {
				method: {
					options: () => ({
						string: () => "off",
						channel: async () => null
					}),
					interactionSend: async (
						_: unknown,
						p: { content?: string }
					) => {
						calls.push(
							p.content ? "reply:" + p.content : "reply:card"
						);
					}
				},
				ihorizon_logs: async () => {
					calls.push("log");
				}
			}
		} as unknown as Client;
		const interaction = {
			guildId: "g",
			guild: { name: "G" },
			channel: {},
			member: { user: { id: "9" } }
		} as never;
		return setlogs.run!(client, interaction, en, []).then(() => calls);
	}

	test("nothing set: no deletion, no log", async () => {
		expect(await run(null)).toEqual([
			"reply:" + en.setlogschannel_already_deleted
		]);
		expect(await run({})).toEqual([
			"reply:" + en.setlogschannel_already_deleted
		]);
	});

	test("something set: deleted, then logged", async () => {
		expect(await run({ voice: "123" })).toEqual([
			"delete",
			"log",
			"reply:card"
		]);
	});
});
