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
import { expect, mock, test } from "bun:test";

const saved = new Map<string, unknown>();
const table = {
	get: async (k: string) => saved.get(k),
	set: async (k: string, v: unknown) => void saved.set(k, v),
	delete: async (k: string) => void saved.delete(k),
	all: async () => []
};
mock.module("../../src/Events/client/ready.js", () =>
	readyTables({
		backupsTable: table,
		metasTable: table,
		backupSchedulesTable: table
	})
);

const { create } = await import("../../src/core/backup/src/index.ts");
const { clearGuild } = await import("../../src/core/backup/src/util.ts");
const { surplusRoleNames } =
	await import("../../src/core/backup/src/components.ts");

function fakeGuild(overrides: Record<string, unknown> = {}) {
	return {
		id: "1",
		name: "Guild",
		verificationLevel: 0,
		explicitContentFilter: 0,
		defaultMessageNotifications: 0,
		emojis: { cache: new (require("discord.js").Collection)() },
		bans: { fetch: async () => new Map() },
		...overrides
	} as never;
}

test("a part that cannot be read is not listed as saved", async () => {
	const data = await create(
		fakeGuild({
			bans: {
				fetch: async () => {
					throw new Error("Missing Permissions");
				}
			}
		}),
		{ components: ["bans", "emojis"] }
	);
	expect(data.components).toEqual(["emojis"]);
	expect(data.incomplete).toEqual(["bans"]);
});

test("a complete capture lists every part", async () => {
	const data = await create(fakeGuild(), {
		components: ["bans", "emojis"]
	});
	expect(data.components).toEqual(["emojis", "bans"]);
	expect(data.incomplete).toEqual([]);
});

test("surplusRoleNames keeps what the backup has, counting duplicates", () => {
	expect(surplusRoleNames(["a", "a", "b"], ["a", "c"])).toEqual(["a", "b"]);
	expect(surplusRoleNames(["a"], ["a"])).toEqual([]);
});

function fakeRole(id: string, name: string, position: number) {
	const role = {
		id,
		name,
		position,
		managed: false,
		editable: true,
		deleted: false,
		delete: async () => {
			role.deleted = true;
		}
	};
	return role;
}

function roleCache(roles: ReturnType<typeof fakeRole>[]) {
	const { Collection } = require("discord.js");
	return new Collection(roles.map((r) => [r.id, r]));
}

test("a restore keeps the roles the backup has", async () => {
	const everyone = fakeRole("1", "@everyone", 0);
	const kept = fakeRole("2", "Mod", 2);
	const extra = fakeRole("3", "Extra", 1);
	const guild = fakeGuild({
		roles: { cache: roleCache([everyone, kept, extra]) },
		channels: { cache: new Map() },
		fetchWebhooks: async () => new Map()
	});

	await clearGuild(guild, ["roles", "channels"], {
		roles: [{ name: "Mod", isEveryone: false }] as never
	});

	expect(kept.deleted).toBe(false);
	expect(everyone.deleted).toBe(false);
	expect(extra.deleted).toBe(true);
});

test("roles are left alone when channels are not rebuilt", async () => {
	const extra = fakeRole("3", "Extra", 1);
	await clearGuild(
		fakeGuild({ roles: { cache: roleCache([extra]) } }),
		["roles"],
		{ roles: [] }
	);
	expect(extra.deleted).toBe(false);
});

test("two roles sharing a name keep distinct overwrites", async () => {
	const { buildOverwrites } =
		await import("../../src/core/backup/src/util.ts");
	const guild = fakeGuild({
		roles: {
			cache: roleCache([
				fakeRole("2", "Team", 2),
				fakeRole("3", "Team", 1)
			])
		}
	});
	const overwrites = await buildOverwrites(
		[
			{ roleName: "Team", allow: "1", deny: "0" },
			{ roleName: "Team", allow: "0", deny: "1" }
		],
		guild
	);
	expect(overwrites.map((o) => o.id)).toEqual(["2", "3"]);
});
