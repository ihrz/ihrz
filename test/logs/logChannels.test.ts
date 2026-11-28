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

// Regression tests for the log channels:
// - /guildconfig setup created ihorizon-logs without an overwrite for the bot (a bot that is not an
//   administrator could never post there) and reported a success even when the creation failed;
// - the unban and channel update logs required the bot to be an administrator (the ban/kick/roles
//   logs only need View Audit Log + Manage Server), so they were silently never posted.

import * as logChannelModule from "../../src/core/functions/logChannel.ts";
import { describe, expect, test } from "bun:test";
import {
	AuditLogEvent,
	OverwriteType,
	PermissionFlagsBits,
	PermissionsBitField
} from "discord.js";

import {
	ihorizonLogsOverwrites,
	subCommand as setup
} from "../../src/Interaction/SlashCommands/guildconfig/!setup.ts";
import { event as unbanLogs } from "../../src/Events/logs/removeBanLogs.ts";
import { event as channelLogs } from "../../src/Events/logs/channelUpdateLogs.ts";

const BOT = "100";
const lang = {
	setup_command_work: "${emoji_Yes} | Channel Setup",
	setup_command_error: "setup error"
} as never;

// What /guildconfig setup passes to `channels.create` (fields checked here).
type CreateOptions = { name: string; permissionOverwrites: { id: string }[] };
type Overwrite = {
	id: string;
	type?: number;
	allow?: bigint[];
	deny?: bigint[];
};

function setupInteraction(
	create: (options: CreateOptions) => Promise<unknown>
) {
	const replies: { content?: string }[] = [];
	const guild = {
		id: "g",
		roles: { everyone: { id: "g" } },
		channels: { cache: { find: () => undefined }, create }
	};
	const interaction = {
		member: {},
		user: { id: "u" },
		channel: {},
		guild,
		editReply: async (reply: { content?: string }) => {
			replies.push(reply);
		}
	} as never;
	const client = {
		user: { id: BOT },
		iHorizon_Emojis: { Yes: "✅" }
	} as never;
	return { interaction, client, replies, guild };
}

describe("/guildconfig setup", () => {
	test("the channel is hidden from @everyone but open to the bot", () => {
		const overwrites = ihorizonLogsOverwrites(
			{ roles: { everyone: { id: "g" } } } as never,
			BOT
		) as Overwrite[];
		const everyone = overwrites.find((o) => o.id === "g");
		const bot = overwrites.find((o) => o.id === BOT);
		expect(everyone!.deny).toContain(PermissionFlagsBits.ViewChannel);
		expect(bot!.type).toBe(OverwriteType.Member);
		expect(bot!.allow).toEqual([
			PermissionFlagsBits.ViewChannel,
			PermissionFlagsBits.SendMessages,
			PermissionFlagsBits.EmbedLinks
		]);
	});

	test("creates the channel with the bot's overwrite and says so", async () => {
		let options = null as CreateOptions | null;
		const { interaction, client, replies } = setupInteraction(async (o) => {
			options = o;
			return { id: "c" };
		});
		await setup.run!(client, interaction, lang);
		expect(options!.name).toBe("ihorizon-logs");
		expect(options!.permissionOverwrites.some((o) => o.id === BOT)).toBe(
			true
		);
		expect(replies).toHaveLength(1);
		expect(replies[0].content).toBeUndefined();
	});

	test("a refused creation is reported as an error, not a success", async () => {
		const { interaction, client, replies } = setupInteraction(async () => {
			throw new Error("Missing Permissions");
		});
		await setup.run!(client, interaction, lang);
		expect(replies).toEqual([{ content: "setup error" }]);
	});
});

// A bot with View Audit Log + Manage Server, not Administrator.
const NOT_ADMIN = new PermissionsBitField([
	PermissionFlagsBits.ViewAuditLog,
	PermissionFlagsBits.ManageGuild,
	PermissionFlagsBits.ViewChannel,
	PermissionFlagsBits.SendMessages
]);

function logGuild(entry: Record<string, unknown>, sent: unknown[]) {
	const logChannel = {
		id: "logs",
		guildId: "g",
		isTextBased: () => true,
		isSendable: () => true,
		send: async (payload: unknown) => {
			sent.push(payload);
			return {};
		},
		client: {
			func: {
				displayBotName: {
					footerBuilder: async () => ({ text: "iHorizon" })
				}
			}
		}
	};
	const db = new Map<string, string>([
		["g.GUILD.SERVER_LOGS.moderation", "logs"],
		["g.GUILD.SERVER_LOGS.channel", "logs"]
	]);
	const client = {
		user: { id: BOT },
		iHorizon_Emojis: new Proxy({}, { get: () => "" }),
		db: { get: async (key: string) => db.get(key) ?? null },
		// Each text is its key: never empty, like the real ones.
		func: {
			getLanguageData: async () =>
				new Proxy({}, { get: (_, key) => String(key) }),
			logChannel: logChannelModule
		}
	} as never;
	(globalThis as { client?: unknown }).client = client;
	const guild = {
		id: "g",
		client,
		members: { me: { permissions: NOT_ADMIN } },
		channels: { cache: new Map([["logs", logChannel]]) },
		fetchAuditLogs: async () => ({
			entries: [
				{
					id: `entry-${Math.random()}`,
					executorId: "mod",
					executor: { id: "mod", displayAvatarURL: () => "" },
					createdTimestamp: Date.now(),
					reason: null,
					changes: [],
					...entry
				}
			]
		})
	};
	return { client, guild };
}

describe("audit log based logs without Administrator", () => {
	test("an unban is logged", async () => {
		const sent: unknown[] = [];
		const { client, guild } = logGuild(
			{
				targetId: "target",
				target: { username: "milo" },
				action: AuditLogEvent.MemberBanRemove
			},
			sent
		);
		const user = { id: "target", displayAvatarURL: () => "" };
		await unbanLogs.run(client, { guild, user } as never);
		expect(sent).toHaveLength(1);
	});

	test("a channel rename is logged", async () => {
		const sent: unknown[] = [];
		const { client, guild } = logGuild({ targetId: "chan" }, sent);
		const channel = (name: string) =>
			({
				id: "chan",
				guildId: "g",
				guild,
				name,
				permissionOverwrites: { cache: new Map() },
				toString: () => "<#chan>"
			}) as never;
		await channelLogs.run(client, channel("general"), channel("chat"));
		expect(sent).toHaveLength(1);
	});
});
