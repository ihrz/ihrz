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
	ChannelType,
	PermissionFlagsBits,
	PermissionsBitField
} from "discord.js";

const ops = await import("../../src/core/modules/moderationOps.ts");
const {
	moderationActions,
	withinBudget,
	roleRefusalMessage,
	channelParam,
	BAN_ERRORS,
	TEMPMUTE_ERRORS
} = await import("../../src/core/modules/gatewayLinkActions/moderation.ts");
const { Params, ActionError } =
	await import("../../src/core/modules/gatewayLinkActions/types.ts");

const GUILD = "100000000000000000";
const OWNER = "200000000000000000";
const MOD = "300000000000000000";
const TARGET = "400000000000000000";
const ROLE = "500000000000000000";
const CHANNEL = "600000000000000000";

// Where the commands are declared: subcommand paths as the loaders build
// them ("cmd sub").
const definitions = [
	"../../src/Interaction/HybridCommands/moderation/mod.ts",
	"../../src/Interaction/HybridCommands/utils/utils.ts",
	"../../src/Interaction/HybridCommands/utils/chanel/channel.ts",
	"../../src/Interaction/HybridCommands/utils/unbanall/unbanall.ts",
	"../../src/Interaction/HybridCommands/utils/util/util.ts"
];

async function commandPaths(): Promise<Map<string, unknown>> {
	// The definitions read `client.timeCalculator` at import.
	const { iHorizonTimeCalculator } =
		await import("../../src/core/functions/ms.ts");
	(globalThis as any).client ??= {};
	(globalThis as any).client.timeCalculator ??= new iHorizonTimeCalculator();
	const paths = new Map<string, unknown>();
	for (const file of definitions) {
		const { command } = await import(file);
		for (const opt of command.options ?? []) {
			paths.set(`${command.name} ${opt.name}`, opt.permission);
		}
	}
	return paths;
}

function member(
	id: string,
	position: number,
	opts: {
		perms?: bigint;
		muted?: boolean;
		bannable?: boolean;
		guild?: any;
	} = {}
): any {
	return {
		id,
		user: { id, username: `u${id.slice(0, 2)}`, globalName: null },
		guild: opts.guild,
		roles: { highest: { position }, cache: new Map() },
		permissions: new PermissionsBitField(opts.perms ?? 0n),
		bannable: opts.bannable ?? true,
		isCommunicationDisabled: () => opts.muted ?? false,
		toString: () => `<@${id}>`
	};
}

function guildWith(members: any[], botPerms: bigint, botPosition = 50) {
	const db = new Map<string, unknown>();
	const guild: any = {
		id: GUILD,
		name: "g",
		ownerId: OWNER,
		client: {
			db: {
				get: async (k: string) => db.get(k) ?? null,
				set: async (k: string, v: unknown) => void db.set(k, v),
				delete: async (k: string) => void db.delete(k)
			},
			func: { ihorizon_logs: async () => {} }
		},
		members: {
			me: member("900000000000000000", botPosition, { perms: botPerms }),
			cache: new Map(members.map((m) => [m.id, m])),
			fetch: async (id: string) => {
				const m = members.find((x) => x.id === id);
				if (!m) throw new Error("unknown");
				return m;
			}
		},
		bans: {
			create: async () => ({}),
			fetch: async () => {
				throw new Error("unknown ban");
			},
			remove: async () => ({})
		},
		roles: { cache: new Map() },
		channels: { cache: new Map() }
	};
	for (const m of members) m.guild = guild;
	guild.members.me.guild = guild;
	return { guild, db };
}

const lang: any = new Proxy({}, { get: (_t, k) => String(k) });

describe("moderation actions: contract", () => {
	test("names and mirrored commands exist", async () => {
		const paths = await commandPaths();
		for (const [name, def] of Object.entries(moderationActions)) {
			expect(name).toMatch(/^[a-z.-]+$/);
			expect(def.command).toBeDefined();
			expect(paths.has(def.command!)).toBe(true);
		}
		// Writes mirror commands that need a real permission.
		expect(paths.get("mod ban")).toBe(PermissionFlagsBits.BanMembers);
		expect(paths.get("unban-all all")).toBe(
			PermissionFlagsBits.Administrator
		);
	});

	test("long jobs answer within the budget", async () => {
		expect(await withinBudget(Promise.resolve(3), 50)).toBe(3);
		const slow = new Promise((r) => setTimeout(() => r(1), 200));
		expect(await withinBudget(slow, 20)).toEqual({ started: true });
		const failing = Promise.reject(new ActionError("nope"));
		await expect(withinBudget(failing, 50)).rejects.toThrow("nope");
	});
});

describe("moderation ops: the commands' guards", () => {
	test("ban: bot permission, self, hierarchy, bannable", async () => {
		const target = member(TARGET, 10);
		const { guild } = guildWith([target], PermissionFlagsBits.BanMembers);
		const mod = member(MOD, 10, { guild });
		const user: any = { id: TARGET, send: async () => ({}) };

		expect(await ops.banUser(mod, user, "r", lang)).toEqual({
			ok: false,
			code: "target_above_author"
		});
		expect(
			await ops.banUser(mod, { ...user, id: MOD } as any, "r", lang)
		).toEqual({ ok: false, code: "self" });

		const higher = member(MOD, 20, { guild });
		expect((await ops.banUser(higher, user, "r", lang)).ok).toBe(true);

		target.bannable = false;
		expect(await ops.banUser(higher, user, "r", lang)).toEqual({
			ok: false,
			code: "not_bannable"
		});

		// A user who left can be banned (no hierarchy to check).
		const gone: any = { id: "700000000000000000", send: async () => ({}) };
		expect((await ops.banUser(higher, gone, "r", lang)).ok).toBe(true);

		// The owner outranks everyone.
		const owner = member(OWNER, 1, { guild });
		target.bannable = true;
		expect((await ops.banUser(owner, user, "r", lang)).ok).toBe(true);

		const noPerm = guildWith([member(TARGET, 1)], 0n).guild;
		expect(
			await ops.banUser(
				member(MOD, 20, { guild: noPerm }),
				user,
				"r",
				lang
			)
		).toEqual({ ok: false, code: "bot_missing_permission" });
	});

	test("tempmute: admin target, above the bot, above the author", async () => {
		const perms =
			PermissionFlagsBits.ManageMessages |
			PermissionFlagsBits.MuteMembers |
			PermissionFlagsBits.ViewAuditLog |
			PermissionFlagsBits.ManageGuild;
		const admin = member(TARGET, 1, {
			perms: PermissionFlagsBits.Administrator
		});
		const { guild } = guildWith([admin], perms, 50);
		const mod = member(MOD, 40, { guild });
		const run = (t: any) =>
			ops.tempmuteMember(mod, t, 1000, "1s", null, lang);

		expect(await run(admin)).toEqual({
			ok: false,
			code: "target_is_admin"
		});
		const aboveBot = member(TARGET, 60, { guild });
		expect(await run(aboveBot)).toEqual({
			ok: false,
			code: "target_above_bot"
		});
		const aboveMod = member(TARGET, 45, { guild });
		expect(await run(aboveMod)).toEqual({
			ok: false,
			code: "target_above_author"
		});
		const muted = member(TARGET, 1, { guild, muted: true });
		expect(await run(muted)).toEqual({ ok: false, code: "already_muted" });
		expect(TEMPMUTE_ERRORS.already_muted).toContain("already");
	});

	test("unmute and kick refuse members ranked at or above the author", async () => {
		const target = member(TARGET, 10, { muted: true });
		const { guild } = guildWith(
			[target],
			PermissionFlagsBits.ManageRoles | PermissionFlagsBits.KickMembers
		);
		const mod = member(MOD, 10, { guild });
		expect(await ops.unmuteMember(mod, target, lang)).toEqual({
			ok: false,
			code: "target_above_author"
		});
		expect(await ops.kickMember(mod, target, "r", lang)).toEqual({
			ok: false,
			code: "target_above_author"
		});
		const notMuted = member(TARGET, 1, { guild });
		expect(
			await ops.unmuteMember(member(MOD, 10, { guild }), notMuted, lang)
		).toEqual({ ok: false, code: "not_muted" });
	});

	test("warns: remove by id, clear, list all", async () => {
		const { guild, db } = guildWith([], 0n);
		const warns = [
			{ id: "AAAA1111", reason: "a", authorID: MOD, timestamp: 1 },
			{ id: "BBBB2222", reason: "b", authorID: MOD, timestamp: 2 }
		];
		db.set(`${GUILD}.USER.${TARGET}.WARNS`, warns);
		db.set(`${GUILD}.USER`, {
			[TARGET]: { WARNS: warns },
			[MOD]: { INVITES: {} }
		});

		expect(await ops.removeWarn(guild, TARGET, "nope")).toEqual({
			ok: false,
			code: "warn_not_found"
		});
		const r = await ops.removeWarn(guild, TARGET, "AAAA1111");
		expect(r.ok).toBe(true);
		expect(db.get(`${GUILD}.USER.${TARGET}.WARNS`)).toEqual([warns[1]]);

		expect(await ops.getAllWarns(guild)).toEqual([
			{ userId: TARGET, warns }
		]);

		expect(await ops.clearWarns(guild, TARGET)).toEqual({
			ok: true,
			count: 1
		});
		expect(await ops.clearWarns(guild, TARGET)).toEqual({
			ok: false,
			code: "no_warns"
		});
	});

	test("role refusals: managed, above the bot, above the author, permissions", () => {
		const { guild } = guildWith([], PermissionFlagsBits.Administrator, 50);
		const role = (position: number, perms = 0n, managed = false): any => ({
			id: ROLE,
			guild,
			position,
			managed,
			permissions: new PermissionsBitField(perms)
		});
		const mod = member(MOD, 30, {
			guild,
			perms: PermissionFlagsBits.ManageRoles
		});
		expect(ops.getRoleRefusal(role(10, 0n, true), mod)?.code).toBe(
			"managed_or_everyone"
		);
		expect(ops.getRoleRefusal(role(60), mod)?.code).toBe("too_high_bot");
		expect(ops.getRoleRefusal(role(30), mod)?.code).toBe("too_high_user");
		const missing = ops.getRoleRefusal(
			role(10, PermissionFlagsBits.BanMembers),
			mod
		);
		expect(missing?.code).toBe("missing_permissions");
		expect(roleRefusalMessage(missing!)).toContain("BanMembers");
		expect(ops.getRoleRefusal(role(10), mod)).toBeNull();
	});

	test("hide/unhide only change what needs to", async () => {
		const deny = new Set<string>();
		const channel: any = {
			manageable: true,
			permissionOverwrites: {
				cache: new Map(),
				edit: async (
					id: string,
					o: { ViewChannel: boolean | null }
				) => {
					if (o.ViewChannel === false) deny.add(id);
					else deny.delete(id);
					channel.permissionOverwrites.cache.set(id, {
						deny: { has: () => deny.has(id) }
					});
				}
			}
		};
		expect(await ops.setChannelHidden(channel, GUILD, false)).toBe(
			"unchanged"
		);
		expect(await ops.setChannelHidden(channel, GUILD, true)).toBe("ok");
		expect(await ops.setChannelHidden(channel, GUILD, true)).toBe(
			"unchanged"
		);
		expect(await ops.setChannelHidden(channel, GUILD, false)).toBe("ok");
		channel.manageable = false;
		expect(await ops.setChannelHidden(channel, GUILD, true)).toBe(
			"not_manageable"
		);
	});
});

describe("moderation actions: parameters", () => {
	function ctx(params: Record<string, unknown>, channels: any[] = []) {
		const { guild } = guildWith([], 0n);
		for (const c of channels) guild.channels.cache.set(c.id, c);
		return {
			client: guild.client,
			guild,
			actor: member(MOD, 10, { guild }),
			params: new Params(params),
			lang
		} as any;
	}

	const channel = (over: Record<string, unknown> = {}) => ({
		id: CHANNEL,
		type: ChannelType.GuildText,
		isThread: () => false,
		permissionOverwrites: {},
		permissionsFor: () =>
			new PermissionsBitField(PermissionFlagsBits.ViewChannel),
		...over
	});

	test("the channel must be of this server, not a thread, and visible", () => {
		expect(() => channelParam(ctx({ channelId: CHANNEL }))).toThrow(
			"channel not found"
		);
		expect(() =>
			channelParam(
				ctx({ channelId: CHANNEL }, [channel({ isThread: () => true })])
			)
		).toThrow("channel not found");
		expect(() =>
			channelParam(
				ctx({ channelId: CHANNEL }, [
					channel({
						permissionsFor: () => new PermissionsBitField(0n)
					})
				])
			)
		).toThrow("forbidden");
		expect(() =>
			channelParam(ctx({ channelId: CHANNEL }, [channel()]), [
				PermissionFlagsBits.ManageMessages
			])
		).toThrow("forbidden");
		expect(channelParam(ctx({ channelId: CHANNEL }, [channel()])).id).toBe(
			CHANNEL
		);
	});

	test("bounds and required fields", async () => {
		const purge = moderationActions["messages.purge"].run;
		await expect(
			purge(
				ctx({ channelId: CHANNEL, amount: 500 }, [
					channel({
						bulkDelete: async () => new Map(),
						isTextBased: () => true,
						permissionsFor: () =>
							new PermissionsBitField(
								PermissionFlagsBits.ViewChannel |
									PermissionFlagsBits.ManageMessages
							)
					})
				])
			)
		).rejects.toThrow("at most 100");
		await expect(
			moderationActions["mutes.add"].run(
				ctx({ userId: TARGET, duration: 10 })
			)
		).rejects.toThrow("member not found");
		await expect(
			moderationActions["warns.add"].run(ctx({ userId: "nope" }))
		).rejects.toThrow("invalid parameter: userId");
		await expect(
			moderationActions["roles.mass"].run(
				ctx({ roleId: ROLE, op: "add" })
			)
		).rejects.toThrow("role not found");
		await expect(
			moderationActions["warns.remove"].run(
				ctx({ userId: TARGET, warnId: "x" })
			)
		).rejects.toThrow("no warns");
		expect(BAN_ERRORS.self).toBe("you can't ban yourself");
	});
});
