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

import { readyTables } from "../readyTables.ts";
import { describe, expect, mock, test } from "bun:test";
import { PermissionFlagsBits, PermissionsBitField } from "discord.js";

const blacklisted = new Set<string>();
mock.module("../../src/Events/client/ready.js", () =>
	readyTables({
		blacklistTable: {
			get: async (key: string) => blacklisted.has(key.split(".")[0])
		}
	})
);

const { authorize, actions } =
	await import("../../src/core/modules/gatewayLinkActions/index.ts");
const { Params, ActionError } =
	await import("../../src/core/modules/gatewayLinkActions/types.ts");

const GUILD = "100000000000000000";
const OWNER = "200000000000000000";
const MOD = "300000000000000000";

function setup(utils: unknown, perms: bigint, id = MOD, roles: string[] = []) {
	const db = {
		get: async (key: string) => {
			if (key === `${GUILD}.UTILS`) return utils;
			return null;
		}
	};
	const client = {
		db,
		// No cooldown, not the owner: writes go through countUse unharmed.
		func: {
			ownerHelper: { isGuildOwner: async () => false },
			helper: {
				cooldown: async () => false,
				getCooldownTimestamp: async () => null
			}
		} as any,
		commands: new Map([
			["ban", { name: "ban", permission: PermissionFlagsBits.BanMembers }]
		]),
		subCommands: new Map([
			["music play", { name: "play", permission: null }]
		])
	};
	(globalThis as any).client = client;
	const member = {
		id,
		client,
		guild: { id: GUILD, ownerId: OWNER },
		permissions: new PermissionsBitField(perms),
		roles: { cache: new Map(roles.map((r) => [r, {}])) }
	};
	return { client: client as any, member: member as any };
}

const refused = async (p: Promise<unknown>) => {
	const e = await p.then(
		() => null,
		(err) => err
	);
	expect(e).toBeInstanceOf(ActionError);
	return (e as Error).message;
};

describe("gateway actions: authorize", () => {
	test("needs the native permission of the mirrored command", async () => {
		const { client, member } = setup(null, 0n);
		expect(
			await refused(
				authorize(client, member, {
					command: "ban",
					run: async () => 0
				})
			)
		).toContain("forbidden");
		const ok = setup(null, PermissionFlagsBits.BanMembers);
		await authorize(ok.client, ok.member, {
			command: "ban",
			run: async () => 0
		});
	});

	test("custom /perm rules grant and restrict like a slash command", async () => {
		// Granted to a role, without BanMembers.
		const role = "400000000000000000";
		const g = setup(
			{ PERMS: { ban: { users: [], roles: [role], level: null } } },
			0n,
			MOD,
			[role]
		);
		await authorize(g.client, g.member, {
			command: "ban",
			run: async () => 0
		});
		// Restricted to someone else: BanMembers is not enough.
		const r = setup(
			{
				PERMS: {
					ban: {
						users: ["500000000000000000"],
						roles: [],
						level: null
					}
				}
			},
			PermissionFlagsBits.BanMembers
		);
		expect(
			await refused(
				authorize(r.client, r.member, {
					command: "ban",
					run: async () => 0
				})
			)
		).toContain("permission rules");
	});

	test("owner-only actions and the global blacklist", async () => {
		const { client, member } = setup(
			null,
			PermissionFlagsBits.Administrator
		);
		expect(
			await refused(
				authorize(client, member, {
					ownerOnly: true,
					run: async () => 0
				})
			)
		).toContain("owner");
		const o = setup(null, 0n, OWNER);
		await authorize(o.client, o.member, {
			ownerOnly: true,
			run: async () => 0
		});
		blacklisted.add(MOD);
		expect(
			await refused(authorize(client, member, { run: async () => 0 }))
		).toContain("blacklisted");
		blacklisted.delete(MOD);
	});

	test("a write counts as a use: the command's cooldown applies, reads are free", async () => {
		const { client, member } = setup(null, PermissionFlagsBits.BanMembers);
		client.commands.get("ban").cooldown = 60_000;
		const used = new Set<string>();
		client.func = {
			ownerHelper: { isGuildOwner: async () => false },
			helper: {
				cooldown: async (id: string, path: string) => {
					const k = `${path}.${id}`;
					if (used.has(k)) return true;
					used.add(k);
					return false;
				},
				getCooldownTimestamp: async () => Date.now()
			}
		};
		// Reads are declared by the bot and never count; anything else does,
		// whatever the gateway's flag says.
		const read = { command: "ban", read: true, run: async () => 0 };
		await authorize(client, member, read);
		await authorize(client, member, read);
		const write = { command: "ban", run: async () => 0 };
		await authorize(client, member, write);
		expect(await refused(authorize(client, member, write))).toContain(
			"cooldown"
		);
	});

	test("an action mirroring an unknown command is refused", async () => {
		const { client, member } = setup(
			null,
			PermissionFlagsBits.Administrator
		);
		expect(
			await refused(
				authorize(client, member, {
					command: "nope",
					run: async () => 0
				})
			)
		).toContain("not found");
	});

	test("every action is guarded by a real command (or is owner-only)", () => {
		// The bot's own catalog (commands.json): "cmd", "cmd sub", "cmd group sub".
		const catalog = require("../../src/files/commands.json") as {
			name: string;
			options?: { name: string; type: number; options?: unknown[] }[];
		}[];
		const paths = new Set<string>();
		const walk = (c: any, prefix: string) => {
			const path = prefix ? `${prefix} ${c.name}` : c.name;
			paths.add(path);
			for (const o of c.options ?? [])
				if (o.type === 1 || o.type === 2) walk(o, path);
		};
		catalog.forEach((c) => walk(c, ""));
		for (const [name, def] of Object.entries(actions)) {
			expect(typeof def.run).toBe("function");
			expect(name).toMatch(/^[a-z.-]+$/);
			if (name === "ping") continue;
			if (!def.ownerOnly) {
				expect(def.command, name).toBeDefined();
			}
			if (def.command)
				expect(
					paths.has(def.command),
					`${name} -> /${def.command}`
				).toBe(true);
		}
	});
});

describe("gateway actions: params", () => {
	test("typed access", () => {
		const p = new Params({
			a: "12",
			b: 7,
			id: "123456789012345678",
			list: "123456789012345678,223456789012345678",
			t: "true",
			s: "x"
		});
		expect(p.int("a")).toBe(12);
		expect(p.int("b", { max: 10 })).toBe(7);
		expect(p.int("missing", { def: 3 })).toBe(3);
		expect(() => p.int("b", { max: 5 })).toThrow("at most 5");
		expect(p.id("id")).toBe("123456789012345678");
		expect(() => p.id("a")).toThrow("invalid parameter: a");
		expect(p.ids("list")).toHaveLength(2);
		expect(p.bool("t")).toBe(true);
		expect(p.bool("nope", true)).toBe(true);
		expect(p.oneOf("s", ["x", "y"] as const)).toBe("x");
		expect(() => p.oneOf("a", ["x"] as const)).toThrow("invalid parameter");
		expect(() => p.str("missing")).toThrow("missing parameter");
		expect(p.optStr("missing")).toBeNull();
		expect(() =>
			new Params({ s: "a".repeat(11) }).str("s", { max: 10 })
		).toThrow("too long");
	});
});
