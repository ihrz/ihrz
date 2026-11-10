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
import { ChannelType, PermissionFlagsBits } from "discord.js";

// The giveaway store reads `giveawaysTable` (ready.js): not needed here, and
// other test files mock ready.js without it.
mock.module("../../src/core/modules/giveawaysDatabaseManager.js", () => ({
	default: {},
	dedupeEntries: (entries: string[] | undefined) => [
		...new Set(entries || [])
	]
}));

const community =
	await import("../../src/core/modules/gatewayLinkActions/community.ts");
const { communityActions, postableChannel } = community;
const { Params, ActionError } =
	await import("../../src/core/modules/gatewayLinkActions/types.ts");
const { checkGiveawayOptions, GiveawayEndedStatus } =
	await import("../../src/core/modules/giveawaysManager.ts");
const { suggestionRows } =
	await import("../../src/core/modules/suggestionManager.ts");

const GUILD = "100000000000000000";
const ACTOR = "200000000000000000";
const BOT = "300000000000000000";
const CHANNEL = "400000000000000000";
const ROLE = "500000000000000000";

const refused = async (p: Promise<unknown> | (() => unknown)) => {
	const e = await (
		typeof p === "function" ? Promise.resolve().then(p) : p
	).then(
		() => null,
		(err) => err
	);
	expect(e).toBeInstanceOf(ActionError);
	return (e as Error).message;
};

function fakeChannel(
	type: ChannelType,
	allow: { actor: bigint[]; bot: bigint[] },
	sent: unknown[] = []
) {
	return {
		id: CHANNEL,
		type,
		toString: () => `<#${CHANNEL}>`,
		permissionsFor: (m: { id: string }) => ({
			has: (perms: bigint[]) =>
				perms.every((p) =>
					(m.id === BOT ? allow.bot : allow.actor).includes(p)
				)
		}),
		sent
	};
}

const VIEW_SEND = [
	PermissionFlagsBits.ViewChannel,
	PermissionFlagsBits.SendMessages
];

function setup(
	channel: unknown,
	db: Record<string, unknown> = {},
	actorPerms: bigint[] = []
) {
	const sent: unknown[] = [];
	const client = {
		db: {
			get: async (k: string) => db[k] ?? null,
			set: async (k: string, v: unknown) => {
				db[k] = v;
			},
			delete: async (k: string) => {
				delete db[k];
			}
		},
		iHorizon_Emojis: { Yes: "y", No: "n", Thinking: "t" },
		func: {
			method: {
				isNumber: (s: string) => !isNaN(Number(s)) && s.trim() !== "",
				channelSend: async (_c: unknown, payload: unknown) => {
					sent.push(payload);
					return { id: "600000000000000000" };
				}
			},
			ihorizon_logs: async () => {}
		}
	};
	const actor = {
		id: ACTOR,
		user: {
			id: ACTOR,
			username: "actor",
			toString: () => `<@${ACTOR}>`
		},
		roles: { cache: new Map() },
		permissions: { has: (p: bigint) => actorPerms.includes(p) }
	};
	const guild = {
		id: GUILD,
		channels: {
			cache: new Map(channel ? [[CHANNEL, channel]] : []),
			fetch: async () => null
		},
		roles: { cache: new Map([[ROLE, {}]]) },
		members: { me: { id: BOT }, cache: new Map() }
	};
	const lang = { say_footer_msg: "\n> - ${author}" };
	return {
		sent,
		db,
		ctx: (params: Record<string, unknown>) =>
			({
				client,
				guild,
				actor,
				lang,
				params: new Params(params)
			}) as any,
		client: client as any,
		guild: guild as any,
		actor: actor as any
	};
}

describe("community actions: shared giveaway checks", () => {
	test("checkGiveawayOptions follows /gw create", () => {
		const { client, guild } = setup(null);
		const none = { type: "none" as const, value: null };
		expect(
			checkGiveawayOptions(client, guild, {
				winnerCount: 0,
				durationMs: 1000,
				requirement: none
			})
		).toBe("winners");
		expect(
			checkGiveawayOptions(client, guild, {
				winnerCount: 1,
				durationMs: 0,
				requirement: none
			})
		).toBe("duration");
		expect(
			checkGiveawayOptions(client, guild, {
				winnerCount: 1,
				durationMs: 1000,
				requirement: { type: "invites", value: "abc" }
			})
		).toBe("invites");
		expect(
			checkGiveawayOptions(client, guild, {
				winnerCount: 1,
				durationMs: 1000,
				requirement: { type: "roles", value: "999999999999999999" }
			})
		).toBe("roles");
		expect(
			checkGiveawayOptions(client, guild, {
				winnerCount: 2,
				durationMs: 1000,
				requirement: { type: "roles", value: ROLE }
			})
		).toBeNull();
	});

	test("summaries: winners string, dedup entries, active first", () => {
		const base = {
			isValid: true,
			guildId: GUILD,
			channelId: CHANNEL,
			winnerCount: 1,
			prize: "p",
			hostedBy: ACTOR,
			embedImageURL: null,
			requirement: { type: "none" as const, value: null }
		};
		const ended = community.summarizeGiveaway("1", {
			...base,
			entries: ["a", "a", "b"],
			winners: "None",
			ended: GiveawayEndedStatus.ENDED,
			expireIn: new Date(1000)
		});
		expect(ended.winners).toEqual([]);
		expect(ended.entries).toBe(2);
		expect(ended.ended).toBe(true);
		const soon = community.summarizeGiveaway("2", {
			...base,
			entries: [],
			winners: [],
			ended: GiveawayEndedStatus.NOT_ENDED,
			expireIn: new Date(5000)
		});
		const later = { ...soon, id: "3", endsAt: 9000 };
		const old = { ...ended, id: "4", endsAt: 10 };
		expect(
			community.sortGiveaways([old, later, ended, soon]).map((g) => g.id)
		).toEqual(["2", "3", "1", "4"]);
	});
});

describe("community actions: parsing", () => {
	test("suggestion codes never become a DB path", async () => {
		expect(community.suggestionCode(new Params({ id: "#AbC123" }))).toBe(
			"AbC123"
		);
		expect(
			await refused(() =>
				community.suggestionCode(new Params({ id: "a.b" }))
			)
		).toContain("invalid");
		expect(
			await refused(() =>
				community.suggestionCode(new Params({ id: "x".repeat(40) }))
			)
		).toContain("id");
	});

	test("board counts are read from the board message", () => {
		expect(community.boardCount("⭐ **12** | <#1>")).toBe(12);
		expect(community.boardCount("nothing")).toBeNull();
		expect(community.boardCount(null)).toBeNull();
	});

	test("suggestion rows: filter on status (pending by default), by score", () => {
		const rows = suggestionRows(
			{
				a: { author: "1", msgId: "1", threadId: null },
				b: {
					author: "2",
					msgId: "2",
					threadId: null,
					status: "accepted",
					votes: { x: "up" }
				},
				c: {
					author: "3",
					msgId: "3",
					threadId: null,
					votes: { x: "up", y: "up", z: "down" }
				}
			},
			null
		);
		expect(rows.map((r) => r.code)).toEqual(["b", "c", "a"]);
		expect(suggestionRows({ a: rows[2].data }, "pending")).toHaveLength(1);
		expect(suggestionRows({ b: rows[0].data }, "pending").length).toBe(0);
	});
});

describe("community actions: guards", () => {
	test("postable channel: type, actor and bot permissions", async () => {
		const both = { actor: VIEW_SEND, bot: VIEW_SEND };
		const ok = setup(fakeChannel(ChannelType.GuildText, both));
		await postableChannel(ok.guild, ok.actor, CHANNEL);

		const voice = setup(fakeChannel(ChannelType.GuildVoice, both));
		expect(
			await refused(postableChannel(voice.guild, voice.actor, CHANNEL))
		).toContain("can't receive");

		const blind = setup(
			fakeChannel(ChannelType.GuildText, { actor: [], bot: VIEW_SEND })
		);
		expect(
			await refused(postableChannel(blind.guild, blind.actor, CHANNEL))
		).toStartWith("forbidden");

		const mute = setup(
			fakeChannel(ChannelType.GuildText, { actor: VIEW_SEND, bot: [] })
		);
		expect(
			await refused(postableChannel(mute.guild, mute.actor, CHANNEL))
		).toContain("bot");

		const none = setup(null);
		expect(
			await refused(postableChannel(none.guild, none.actor, CHANNEL))
		).toContain("not found");
	});

	test("messages.say posts /say's text without any ping", async () => {
		const s = setup(
			fakeChannel(ChannelType.GuildText, {
				actor: VIEW_SEND,
				bot: VIEW_SEND
			})
		);
		const out = (await communityActions["messages.say"].run(
			s.ctx({ channelId: CHANNEL, content: "hi @everyone" })
		)) as { messageId: string };
		expect(out.messageId).toBe("600000000000000000");
		expect(s.sent[0]).toEqual({
			content: `> hi @everyone\n> - <@${ACTOR}>`,
			allowedMentions: { roles: [], users: [], repliedUser: false }
		});
		expect(
			await refused(
				communityActions["messages.say"].run(
					s.ctx({ channelId: CHANNEL, content: "x".repeat(1995) })
				)
			)
		).toContain("too long");
	});

	test("suggestion staff only, and only when the system is on", async () => {
		const notStaff = setup(null, {
			[`${GUILD}.SUGGEST`]: { channel: CHANNEL }
		});
		expect(
			await refused(
				communityActions["suggestions.accept"].run(
					notStaff.ctx({ id: "abc", reason: "ok" })
				)
			)
		).toStartWith("forbidden");

		const off = setup(
			null,
			{ [`${GUILD}.SUGGEST`]: { channel: CHANNEL, disable: true } },
			[PermissionFlagsBits.Administrator]
		);
		expect(
			await refused(
				communityActions["suggestions.delete"].run(
					off.ctx({ id: "abc" })
				)
			)
		).toContain("disabled");

		const on = setup(null, { [`${GUILD}.SUGGEST`]: { channel: CHANNEL } }, [
			PermissionFlagsBits.Administrator
		]);
		expect(
			await refused(
				communityActions["suggestions.delete"].run(
					on.ctx({ id: "abc" })
				)
			)
		).toBe("suggestion not found");
	});

	test("every action mirrors a command and has a valid name", () => {
		for (const [name, def] of Object.entries(communityActions)) {
			expect(name).toMatch(/^[a-z.-]+$/);
			expect(typeof def.command).toBe("string");
		}
	});
});
