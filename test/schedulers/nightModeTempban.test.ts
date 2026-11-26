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

import { afterEach, beforeEach, expect, test } from "bun:test";

import {
	Collection,
	PermissionFlagsBits,
	PermissionsBitField
} from "discord.js";

import { NightModeManager } from "../../src/core/modules/nightModeManager.ts";
import { TempbanManager } from "../../src/core/modules/tempbanManager.ts";
import type { LanguageData } from "../../types/languageData.ts";

// The managers with their Discord-facing internals replaced or reached.
type TestableNightMode = {
	Basics_Check: () => unknown;
	Notify_Server_Owner: () => Promise<void>;
	Remove_All_PA: (
		guild: unknown,
		opt: unknown,
		lang: LanguageData
	) => Promise<void>;
	Add_All_PA: (
		guild: unknown,
		opt: unknown,
		lang: LanguageData
	) => Promise<void>;
};
type TestableTempban = { checkExpiredBans: () => Promise<void> };

const ADMIN = PermissionFlagsBits.Administrator;
const lang = new Proxy({} as LanguageData, { get: () => "text" });

let errors: string[];
// test/preload.ts pins the logger stand-in (assignments are ignored): spy on
// its err method instead of replacing it.
const standIn = (globalThis as { logger?: unknown }).logger as {
	err: (message: string) => unknown;
};
const standInErr = standIn.err;

beforeEach(() => {
	errors = [];
	standIn.err = (message: string) => errors.push(String(message));
});

afterEach(() => {
	standIn.err = standInErr;
	delete (globalThis as { client?: unknown }).client;
});

function makeDb(initial: Record<string, unknown> = {}) {
	const store = new Map<string, unknown>(Object.entries(initial));
	return {
		store,
		get: async (key: string) => store.get(key),
		set: async (key: string, value: unknown) => {
			store.set(key, value);
		},
		delete: async (key: string) => {
			store.delete(key);
		}
	};
}

function makeRole(id: string, fails: boolean) {
	const role = {
		id,
		name: id,
		managed: false,
		permissions: new PermissionsBitField(ADMIN),
		guild: { members: { me: { roles: { botRole: null } } } },
		setPermissions: async (
			permissions: PermissionsBitField
		): Promise<void> => {
			if (fails) throw new Error(`cannot edit ${id}`);
			role.permissions = new PermissionsBitField(permissions);
		}
	};
	return role;
}

function makeNightMode() {
	const manager = new NightModeManager() as unknown as TestableNightMode;
	manager.Basics_Check = () => ({
		im_self_admin: true,
		im_on_top: true,
		is_admin: true
	});
	manager.Notify_Server_Owner = async () => {};
	return manager;
}

const CHANGED = "g.UTILS.NIGHT_MODE.changed_roles";

test("night mode start keeps the roles still waiting from an earlier night", async () => {
	const db = makeDb({ [CHANGED]: ["older"] });
	const roles = new Collection([
		["ok", makeRole("ok", false)],
		["broken", makeRole("broken", true)]
	]);
	const guild = {
		id: "g",
		client: { db },
		roles: { fetch: async () => roles }
	};

	await makeNightMode().Remove_All_PA(guild, { data: {} }, lang);

	expect(db.store.get(CHANGED)).toEqual(["older", "ok"]);
	expect(roles.get("ok")!.permissions.has(ADMIN)).toBe(false);
	expect(errors.some((e) => e.includes("broken"))).toBe(true);
});

test("night mode end gives every role back and keeps the failed ones", async () => {
	const ok = makeRole("ok", false);
	const broken = makeRole("broken", true);
	ok.permissions = new PermissionsBitField(0n);
	broken.permissions = new PermissionsBitField(0n);
	const byId: Record<string, ReturnType<typeof makeRole>> = { ok, broken };
	const db = makeDb({ [CHANGED]: ["broken", "ok"] });
	const guild = {
		id: "g",
		client: { db },
		roles: { fetch: async (id: string) => byId[id] ?? null }
	};

	await makeNightMode().Add_All_PA(guild, { data: {} }, lang);

	// The failing role did not stop the loop, and stays saved for next time.
	expect(ok.permissions.has(ADMIN)).toBe(true);
	expect(db.store.get(CHANGED)).toEqual(["broken"]);
});

test("a tempban that cannot be lifted is retried, but logged only once", async () => {
	let allowed = false;
	const db = makeDb({
		"g.GUILD.TEMPBAN": { u: { reason: "r", time: 0 } }
	});
	// The pass reads the guild object, then deletes the entry by key.
	db.delete = async (key: string) => {
		db.store.delete(key);
		if (key === "g.GUILD.TEMPBAN.u") db.store.set("g.GUILD.TEMPBAN", {});
	};
	const guild = {
		id: "g",
		members: {
			unban: async () => {
				if (!allowed)
					throw Object.assign(new Error("Missing Permissions"), {
						code: 50013
					});
			}
		}
	};
	(globalThis as { client?: unknown }).client = {
		db,
		guilds: { cache: new Collection([["g", guild]]) }
	};

	const manager = new TempbanManager() as unknown as TestableTempban;
	await manager.checkExpiredBans();
	await manager.checkExpiredBans();
	await manager.checkExpiredBans();

	expect(errors.filter((e) => e.includes("tempban"))).toHaveLength(1);
	expect(db.store.get("g.GUILD.TEMPBAN")).toEqual({
		u: { reason: "r", time: 0 }
	});

	allowed = true;
	await manager.checkExpiredBans();
	expect(db.store.get("g.GUILD.TEMPBAN")).toEqual({});
});
