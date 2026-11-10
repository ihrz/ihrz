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

const {
	activeLeashes,
	canManageNickLock,
	canMoveMember,
	canVoiceKick,
	editMemberInvites,
	releaseLeash,
	resetGuildInvites,
	resetGuildSection,
	sortLockNames
} = await import("../../src/core/modules/memberToolsManager.ts");
const { membersActions, settle, MAX_MONEY_AMOUNT } =
	await import("../../src/core/modules/gatewayLinkActions/members.ts");
const { Params, ActionError } =
	await import("../../src/core/modules/gatewayLinkActions/types.ts");

const GUILD = "100000000000000000";
const OWNER = "200000000000000000";
const MOD = "300000000000000000";
const TARGET = "400000000000000000";
const CHAN = "500000000000000000";

// In-memory `client.db` with the dotted keys of HorizonDB.
function fakeDb(initial: Record<string, unknown> = {}) {
	const root: Record<string, any> = structuredClone(initial);
	const walk = (key: string, create: boolean) => {
		const parts = key.split(".");
		let node: any = root;
		for (const p of parts.slice(0, -1)) {
			if (node[p] === undefined || node[p] === null) {
				if (!create) return [undefined, parts.at(-1)!] as const;
				node[p] = {};
			}
			node = node[p];
		}
		return [node, parts.at(-1)!] as const;
	};
	return {
		root,
		get: async (key: string) => {
			const [n, k] = walk(key, false);
			return n?.[k] ?? null;
		},
		set: async (key: string, v: unknown) => {
			const [n, k] = walk(key, true);
			n[k] = v;
		},
		add: async (key: string, v: number) => {
			const [n, k] = walk(key, true);
			n[k] = (n[k] ?? 0) + v;
		},
		sub: async (key: string, v: number) => {
			const [n, k] = walk(key, true);
			n[k] = (n[k] ?? 0) - v;
		},
		delete: async (key: string) => {
			const [n, k] = walk(key, false);
			if (n) delete n[k];
		}
	};
}

function member(
	id: string,
	opts: { position?: number; perms?: bigint; voice?: string | null } = {}
) {
	return {
		id,
		user: { username: id, bot: false },
		displayName: id,
		displayAvatarURL: () => "",
		toString: () => `<@${id}>`,
		manageable: true,
		nickname: null,
		roles: { highest: { position: opts.position ?? 1 } },
		permissions: new PermissionsBitField(opts.perms ?? 0n),
		voice: {
			channelId: opts.voice ?? null,
			channel: opts.voice ? { id: opts.voice, name: "vc" } : null,
			setChannel: async () => {}
		}
	} as any;
}

function ctx(
	params: Record<string, unknown>,
	db = fakeDb(),
	members: any[] = [],
	actor = member(MOD, { position: 5 })
) {
	const logs: string[] = [];
	const guild: any = {
		id: GUILD,
		ownerId: OWNER,
		members: {
			cache: new Map(members.map((m) => [m.id, m])),
			fetch: async (id: string) => {
				const m = members.find((x) => x.id === id);
				if (!m) throw new Error("unknown member");
				return m;
			}
		},
		channels: { cache: new Map() }
	};
	const client: any = {
		db,
		subCommands: new Map(),
		func: {
			ihorizon_logs: async (_: unknown, e: { title: string }) => {
				logs.push(e.title);
			},
			economyLogs: { addMoney: () => {}, removeMoney: () => {} }
		}
	};
	const lang = new Proxy({}, { get: (_, k) => String(k) }) as any;
	return {
		c: { client, guild, actor, params: new Params(params), lang },
		logs,
		db
	};
}

const refused = async (p: Promise<unknown>) => {
	const e = await p.then(
		() => null,
		(err) => err
	);
	expect(e).toBeInstanceOf(ActionError);
	return (e as Error).message;
};

describe("member tools: pure guards", () => {
	test("nick lock hierarchy mirrors /utilss lockname", () => {
		const guild = { ownerId: OWNER } as any;
		const mod = member(MOD, { position: 5 });
		expect(
			canManageNickLock(guild, mod, member(TARGET, { position: 4 }))
		).toBe(true);
		expect(
			canManageNickLock(guild, mod, member(TARGET, { position: 5 }))
		).toBe(false);
		expect(
			canManageNickLock(guild, mod, member(OWNER, { position: 1 }))
		).toBe(false);
		// The owner can lock anyone.
		expect(
			canManageNickLock(
				guild,
				member(OWNER, { position: 1 }),
				member(TARGET, { position: 9 })
			)
		).toBe(true);
	});

	test("only an administrator moves an administrator; admins can't be vkicked", () => {
		const admin = member(TARGET, {
			perms: PermissionFlagsBits.Administrator
		});
		expect(canMoveMember(member(MOD), admin)).toBe(false);
		expect(
			canMoveMember(
				member(MOD, { perms: PermissionFlagsBits.Administrator }),
				admin
			)
		).toBe(true);
		expect(canMoveMember(member(MOD), member(TARGET))).toBe(true);
		expect(canVoiceKick(admin)).toBe(false);
		expect(canVoiceKick(member(TARGET))).toBe(true);
	});

	test("lock list sorted newest first, leashes filtered by age", () => {
		const sorted = sortLockNames({
			a: { nick: "a", lockedAt: 1 },
			b: { nick: "b", lockedAt: 3 },
			c: undefined
		});
		expect(sorted.map(([id]) => id)).toEqual(["b", "a"]);
		const now = 10_000;
		expect(
			activeLeashes(
				[
					{ dom: "1", sub: "2", timestamp: 9_000 },
					{ dom: "1", sub: "3", timestamp: 1_000 }
				],
				2_000,
				now
			)
		).toEqual([{ dom: "1", sub: "2", timestamp: 9_000 }]);
	});
});

describe("member tools: database format", () => {
	test("invites add/remove keep the /inv format", async () => {
		const db = fakeDb();
		const client = { db } as any;
		expect(await editMemberInvites(client, GUILD, TARGET, "add", 5)).toBe(
			5
		);
		expect(
			await editMemberInvites(client, GUILD, TARGET, "remove", 2)
		).toBe(3);
		expect(db.root[GUILD].USER[TARGET].INVITES).toEqual({
			regular: 0,
			bonus: 3,
			leaves: 0,
			invites: 3
		});
		expect(await resetGuildInvites(client, GUILD)).toBe(1);
		expect(db.root[GUILD].USER[TARGET].INVITES).toEqual({});
	});

	test("greset drops one section of every member", async () => {
		const db = fakeDb({
			[GUILD]: {
				USER: {
					[TARGET]: { ECONOMY: { money: 4 }, XP_LEVELING: { xp: 1 } },
					[MOD]: { ECONOMY: { money: 1 } }
				}
			}
		});
		expect(await resetGuildSection({ db } as any, GUILD, "ECONOMY")).toBe(
			2
		);
		expect(db.root[GUILD].USER[TARGET]).toEqual({ XP_LEVELING: { xp: 1 } });
	});

	test("unleash only releases the actor's own leash", async () => {
		const db = fakeDb({
			[GUILD]: {
				UTILS: { LEASH: [{ dom: MOD, sub: TARGET, timestamp: 1 }] }
			}
		});
		const client = { db } as any;
		expect(await releaseLeash(client, GUILD, OWNER, TARGET)).toBe(false);
		expect(await releaseLeash(client, GUILD, MOD, TARGET)).toBe(true);
		expect(db.root[GUILD].UTILS.LEASH).toEqual([]);
	});
});

describe("member actions", () => {
	test("settle answers late jobs with started", async () => {
		expect(await settle(Promise.resolve({ moved: 1 }), 50)).toEqual({
			moved: 1,
			done: true
		});
		expect(
			await settle(
				new Promise<object>((r) => setTimeout(() => r({}), 200)),
				20
			)
		).toEqual({ done: false, started: true });
	});

	test("invites.add validates and logs like the command", async () => {
		const t = ctx({ userId: TARGET, amount: 3 }, fakeDb(), [
			member(TARGET)
		]);
		expect(await membersActions["invites.add"].run(t.c as any)).toEqual({
			userId: TARGET,
			invites: 3
		});
		expect(t.logs).toEqual(["addinvites_logs_embed_title"]);
		const zero = ctx({ userId: TARGET, amount: 0 }, fakeDb(), [
			member(TARGET)
		]);
		expect(
			await refused(membersActions["invites.remove"].run(zero.c as any))
		).toContain("at least");
		const gone = ctx({ userId: TARGET, amount: 1 });
		expect(
			await refused(membersActions["invites.add"].run(gone.c as any))
		).toContain("not found");
	});

	test("economy.add/remove: disabled economy, bounds", async () => {
		const db = fakeDb({ [GUILD]: { ECONOMY: { disabled: true } } });
		const t = ctx({ userId: TARGET, amount: 3 }, db, [member(TARGET)]);
		expect(
			await refused(membersActions["economy.add"].run(t.c as any))
		).toContain("disabled");
		const big = ctx(
			{ userId: TARGET, amount: MAX_MONEY_AMOUNT + 1 },
			fakeDb(),
			[member(TARGET)]
		);
		expect(
			await refused(membersActions["economy.add"].run(big.c as any))
		).toContain("at most");
		const ok = ctx({ userId: TARGET, amount: 2 }, fakeDb(), [
			member(TARGET)
		]);
		expect(await membersActions["economy.remove"].run(ok.c as any)).toEqual(
			{
				userId: TARGET,
				money: -2
			}
		);
	});

	test("locknames.lock refuses a member above the actor", async () => {
		const t = ctx({ userId: TARGET }, fakeDb(), [
			member(TARGET, { position: 9 })
		]);
		expect(
			await refused(membersActions["locknames.lock"].run(t.c as any))
		).toContain("forbidden");
	});

	test("voice.move: admin guard, hidden channel", async () => {
		const target = member(TARGET, {
			perms: PermissionFlagsBits.Administrator,
			voice: "600000000000000000"
		});
		const t = ctx({ userId: TARGET, toChannelId: CHAN }, fakeDb(), [
			target
		]);
		t.c.guild.channels.cache.set(CHAN, {
			id: CHAN,
			type: ChannelType.GuildVoice,
			permissionsFor: () =>
				new PermissionsBitField(PermissionFlagsBits.ViewChannel)
		});
		expect(
			await refused(membersActions["voice.move"].run(t.c as any))
		).toContain("administrator");
		t.c.guild.channels.cache.set(CHAN, {
			id: CHAN,
			type: ChannelType.GuildVoice,
			permissionsFor: () => new PermissionsBitField(0n)
		});
		expect(
			await refused(membersActions["voice.move"].run(t.c as any))
		).toContain("can't see");
	});
});
