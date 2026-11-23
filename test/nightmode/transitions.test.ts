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

import {
	NightModeManager,
	saveNightModeSettings
} from "../../src/core/modules/nightModeManager.ts";

const ADMIN = PermissionFlagsBits.Administrator;
const lang = new Proxy({}, { get: (_, k) => String(k) }) as any;
const NM = "g.UTILS.NIGHT_MODE";

/** Dotted-path store, like the bot's database. */
function makeDb(root: Record<string, any> = {}) {
	const walk = (key: string, create: boolean) => {
		const parts = key.split(".");
		let node: any = root;
		for (const part of parts.slice(0, -1)) {
			if (node[part] === undefined) {
				if (!create) return { node: undefined, last: "" };
				node[part] = {};
			}
			node = node[part];
		}
		return { node, last: parts[parts.length - 1] };
	};
	return {
		root,
		get: async (key: string) => {
			const { node, last } = walk(key, false);
			return node?.[last];
		},
		set: async (key: string, value: unknown) => {
			const { node, last } = walk(key, true);
			node[last] = structuredClone(value);
		},
		delete: async (key: string) => {
			const { node, last } = walk(key, false);
			if (node) delete node[last];
		}
	};
}

function makeRole(id: string, admin = true) {
	const role: any = {
		id,
		name: id,
		managed: false,
		fails: false,
		permissions: new PermissionsBitField(admin ? ADMIN : 0n),
		guild: { members: { me: { roles: { botRole: null } } } },
		setPermissions: async (permissions: PermissionsBitField) => {
			if (role.fails) throw new Error(`cannot edit ${id}`);
			role.permissions = new PermissionsBitField(permissions);
		}
	};
	return role;
}

let dms: string[];

function setup(nightMode: Record<string, any>, roles: any[]) {
	const db = makeDb({ g: { UTILS: { NIGHT_MODE: nightMode } } });
	const byId = new Collection<string, any>(roles.map((r) => [r.id, r]));
	const guild: any = {
		id: "g",
		client: { db },
		roles: {
			fetch: async (id?: string) => (id ? (byId.get(id) ?? null) : byId)
		}
	};
	(globalThis as any).client = {
		db,
		guilds: {
			cache: new Collection([["g", guild]]),
			fetch: async () => guild
		},
		func: { getLanguageData: async () => lang },
		iHorizon_Emojis: { Warning_Icon: "!" }
	};
	const manager = new NightModeManager() as any;
	const checks = { im_self_admin: true, im_on_top: true, is_admin: true };
	manager.Basics_Check = () => checks;
	manager.Notify_Server_Owner = async (_: any, opt: any) => {
		dms.push(opt.msg?.content ?? `embed:${opt.type}`);
	};
	let phase: "started" | "ended" = "started";
	manager.calculate_window_time = async () => phase;
	const tick = async () => manager.Refresh(await manager.GetNightModeData());
	return {
		db,
		manager,
		checks,
		tick,
		setPhase: (p: typeof phase) => (phase = p)
	};
}

const state = (db: any) => db.root.g.UTILS.NIGHT_MODE;
const warnings = () => dms.filter((m) => m.startsWith("var_nm_error_occured"));

beforeEach(() => {
	dms = [];
});

afterEach(() => {
	delete (globalThis as any).client;
});

test("night start blocked by the bot's role is retried next tick, owner warned once", async () => {
	const admin = makeRole("admins");
	const { db, checks, tick } = setup(
		{
			enabled: true,
			notify: true,
			time: [21, 0, 9, 0],
			utc: 1,
			last_state: "ended"
		},
		[admin]
	);
	checks.im_on_top = false;

	await tick();
	await tick();
	expect(state(db).last_state).toBe("ended");
	expect(admin.permissions.has(ADMIN)).toBe(true);
	expect(warnings()).toHaveLength(1);

	checks.im_on_top = true;
	await tick();
	expect(state(db).last_state).toBe("started");
	expect(state(db).changed_roles).toEqual(["admins"]);
	expect(admin.permissions.has(ADMIN)).toBe(false);
	expect(warnings()).toHaveLength(1);
	// Start embed sent once, then the summary once the roles are taken.
	expect(dms.filter((m) => m === "embed:started")).toHaveLength(1);
	expect(dms.filter((m) => m.startsWith("var_nm_start_main"))).toHaveLength(
		1
	);
});

test("a role that cannot be stripped keeps the night pending until it is", async () => {
	const ok = makeRole("ok");
	const broken = makeRole("broken");
	broken.fails = true;
	const { db, tick } = setup(
		{
			enabled: true,
			notify: true,
			time: [21, 0, 9, 0],
			utc: 1,
			last_state: "ended"
		},
		[ok, broken]
	);

	await tick();
	await tick();
	expect(state(db).last_state).toBe("ended");
	expect(state(db).changed_roles).toEqual(["ok"]);
	expect(warnings()).toHaveLength(1);

	broken.fails = false;
	await tick();
	expect(state(db).last_state).toBe("started");
	expect(state(db).changed_roles).toEqual(["ok", "broken"]);
	expect(broken.permissions.has(ADMIN)).toBe(false);
});

test("morning restore that fails is retried until every role is back", async () => {
	const ok = makeRole("ok", false);
	const broken = makeRole("broken", false);
	broken.fails = true;
	const { db, tick, setPhase } = setup(
		{
			enabled: true,
			notify: true,
			time: [21, 0, 9, 0],
			utc: 1,
			last_state: "started",
			changed_roles: ["ok", "broken"]
		},
		[ok, broken]
	);
	setPhase("ended");

	await tick();
	await tick();
	expect(ok.permissions.has(ADMIN)).toBe(true);
	expect(state(db).last_state).toBe("started");
	expect(state(db).changed_roles).toEqual(["broken"]);
	expect(warnings()).toHaveLength(1);

	broken.fails = false;
	await tick();
	expect(broken.permissions.has(ADMIN)).toBe(true);
	expect(state(db).last_state).toBe("ended");
	expect(state(db).changed_roles).toBeUndefined();
});

test("turning night mode off during the night gives the roles back", async () => {
	const admin = makeRole("admins", false);
	const { db, tick } = setup(
		{
			enabled: false,
			notify: false,
			time: [21, 0, 9, 0],
			utc: 1,
			last_state: "started",
			changed_roles: ["admins"]
		},
		[admin]
	);

	await tick();
	expect(admin.permissions.has(ADMIN)).toBe(true);
	expect(state(db).changed_roles).toBeUndefined();
	expect(state(db).last_state).toBe("ended");

	// Nothing left to do: the guild is skipped afterwards.
	admin.permissions = new PermissionsBitField(0n);
	await tick();
	expect(admin.permissions.has(ADMIN)).toBe(false);
});

test("a disabled night mode with nothing to give back is left alone", async () => {
	const admin = makeRole("admins");
	const { db, tick } = setup(
		{ enabled: false, time: [21, 0, 9, 0], utc: 1, last_state: "ended" },
		[admin]
	);
	await tick();
	expect(admin.permissions.has(ADMIN)).toBe(true);
	expect(state(db).changed_roles).toBeUndefined();
	expect(dms).toHaveLength(0);
});

test("the panel saves its settings without touching the night state", async () => {
	const db = makeDb({
		g: {
			UTILS: {
				NIGHT_MODE: {
					enabled: true,
					time: [21, 0, 9, 0],
					utc: 1,
					last_state: "started",
					changed_roles: ["a", "b"]
				}
			}
		}
	});
	// Snapshot the panel took before the night started.
	const stale: any = {
		enabled: false,
		notify: true,
		time: [22, 0, 7, 0],
		derankBot: true,
		wlBots: ["bot"],
		utc: 2,
		last_state: "ended",
		changed_roles: []
	};
	await saveNightModeSettings(db, "g", stale);
	expect(db.root.g.UTILS.NIGHT_MODE).toEqual({
		enabled: false,
		notify: true,
		time: [22, 0, 7, 0],
		derankBot: true,
		wlBots: ["bot"],
		utc: 2,
		last_state: "started",
		changed_roles: ["a", "b"]
	});
});
