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
import {
	Collection,
	PermissionFlagsBits,
	PermissionsBitField
} from "discord.js";

const prevnames = new Map<string, unknown>();
mock.module("../../src/Events/client/ready.js", () =>
	readyTables({
		blacklistTable: { get: async () => null },
		prevnamesTable: { get: async (k: string) => prevnames.get(k) ?? null },
		metasTable: { get: async () => null }
	})
);

// The real module loads every backup table; these tests only need its errors.
mock.module("../../src/core/backup/src/index.js", () => ({
	BackupBusyError: class BackupBusyError extends Error {},
	BackupLimitError: class BackupLimitError extends Error {}
}));

const server =
	await import("../../src/core/modules/gatewayLinkActions/server.ts");
const { serverActions, decodeImage, sniffImageType, EMOJI_NAME } = server;
const { Params, ActionError } =
	await import("../../src/core/modules/gatewayLinkActions/types.ts");
const { buildSchedule, computeNextRun } =
	await import("../../src/core/backup/src/components.ts");
const { automodFlagValue } =
	await import("../../src/core/modules/automodRules.ts");
const { adminMembers, adminRoles, guildBots } =
	await import("../../src/core/modules/serverAudit.ts");
const { prepareBackupLoad } =
	await import("../../src/core/modules/backupPanels.ts");

const GUILD = "100000000000000000";
const OWNER = "200000000000000000";
const ACTOR = "300000000000000000";
const BOT = "400000000000000000";

(globalThis as any).client = {
	func: {
		validImageType: (t: string | null) =>
			["image/png", "image/jpeg", "image/gif", "image/webp"].includes(
				t ?? ""
			)
	}
};
(globalThis as any).logger = { err: () => undefined };

const PNG = Buffer.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0
]);

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

const perms = (...p: bigint[]) =>
	new PermissionsBitField(p.reduce((a, b) => a | b, 0n));

function fakeMember(id: string, o: { bot?: boolean; admin?: boolean } = {}) {
	return {
		id,
		user: {
			id,
			bot: !!o.bot,
			username: `u${id.slice(0, 3)}`,
			displayName: "x",
			displayAvatarURL: () => "a",
			flags: null
		},
		guild: { ownerId: OWNER, id: GUILD },
		client: { user: { id: BOT } },
		displayName: "x",
		joinedTimestamp: Number(id.slice(0, 2)),
		displayAvatarURL: () => "a",
		roles: { highest: { id: GUILD } },
		permissions: o.admin
			? perms(PermissionFlagsBits.Administrator)
			: perms()
	};
}

function fakeGuild(members: ReturnType<typeof fakeMember>[], botPerms = 0n) {
	const roles = new Collection<string, any>([
		[
			"500000000000000001",
			{
				id: "500000000000000001",
				name: "low admin",
				position: 1,
				color: 0,
				managed: false,
				permissions: perms(PermissionFlagsBits.Administrator),
				members: new Collection(
					members.slice(0, 3).map((m) => [m.id, m])
				)
			}
		],
		[
			"500000000000000002",
			{
				id: "500000000000000002",
				name: "high admin",
				position: 5,
				color: 0,
				managed: false,
				permissions: perms(PermissionFlagsBits.Administrator),
				members: new Collection()
			}
		],
		[
			"500000000000000003",
			{
				id: "500000000000000003",
				name: "member",
				position: 3,
				color: 0,
				managed: false,
				permissions: perms(PermissionFlagsBits.SendMessages),
				members: new Collection()
			}
		]
	]);
	return {
		id: GUILD,
		ownerId: OWNER,
		roles: { cache: roles },
		members: {
			cache: new Collection(members.map((m) => [m.id, m])),
			me: { permissions: perms(botPerms) }
		},
		emojis: { cache: new Collection([["1", { name: "taken" }]]) },
		channels: { cache: new Collection() }
	};
}

function ctx(guild: any, params: Record<string, unknown>, client: any = {}) {
	return {
		client,
		guild,
		actor: { id: ACTOR, user: { id: ACTOR } },
		params: new Params(params),
		lang: {}
	} as any;
}

describe("server actions: images", () => {
	test("type comes from the bytes", () => {
		expect(sniffImageType(PNG)).toBe("image/png");
		expect(sniffImageType(Buffer.from("GIF89a-------"))).toBe("image/gif");
		expect(sniffImageType(Buffer.from("not an image"))).toBeNull();
	});

	test("decodes base64 and data URIs, refuses the rest", async () => {
		const b64 = PNG.toString("base64");
		expect(decodeImage(b64, "image", 1024).buffer.equals(PNG)).toBe(true);
		expect(
			decodeImage(`data:image/png;base64,${b64}`, "image", 1024).type
		).toBe("image/png");
		expect(await refused(() => decodeImage("@@@@", "image", 1024))).toBe(
			"invalid parameter: image"
		);
		expect(
			await refused(() =>
				decodeImage(
					Buffer.from("hello world!").toString("base64"),
					"image",
					1024
				)
			)
		).toContain("PNG, JPEG");
		// Too big: refused before decoding.
		expect(
			await refused(() =>
				decodeImage(
					Buffer.alloc(4096).toString("base64"),
					"image",
					1024
				)
			)
		).toContain("larger than 1 KiB");
		expect(await refused(() => decodeImage(42, "image", 1024))).toBe(
			"missing parameter: image"
		);
	});

	test("emoji names follow Discord's rule", () => {
		expect(EMOJI_NAME.test("cool_cat")).toBe(true);
		expect(EMOJI_NAME.test("a")).toBe(false);
		expect(EMOJI_NAME.test("cool cat")).toBe(false);
		expect(EMOJI_NAME.test("x".repeat(33))).toBe(false);
	});
});

describe("server actions: audit", () => {
	const members = [
		fakeMember("600000000000000003", { admin: true }),
		fakeMember(OWNER, { admin: true }),
		fakeMember(BOT, { admin: true, bot: true }),
		fakeMember("700000000000000001", { bot: true }),
		fakeMember("610000000000000000")
	];
	const guild = fakeGuild(members);

	test("admins: roles highest first, members without owner nor this bot", () => {
		expect(adminRoles(guild as any).map((r) => r.name)).toEqual([
			"high admin",
			"low admin"
		]);
		expect(adminMembers(guild as any).map((m) => m.id)).toEqual([
			"600000000000000003"
		]);
		expect(guildBots(guild as any).map((m) => m.id)).toEqual([
			BOT,
			"700000000000000001"
		]);
	});

	test("role members are paged by id", async () => {
		const run = serverActions["roles.members"].run;
		const first = (await run(
			ctx(guild, { roleId: "500000000000000001", limit: "2" })
		)) as any;
		expect(first.members.map((m: any) => m.id)).toEqual([OWNER, BOT]);
		expect(first.nextCursor).toBe(BOT);
		const second = (await run(
			ctx(guild, {
				roleId: "500000000000000001",
				limit: "2",
				after: first.nextCursor
			})
		)) as any;
		expect(second.members.map((m: any) => m.id)).toEqual([
			"600000000000000003"
		]);
		expect(second.nextCursor).toBeNull();
		expect(
			await refused(run(ctx(guild, { roleId: "599999999999999999" })))
		).toBe("role not found");
	});

	test("webhooks never carry their token", async () => {
		const g = {
			...guild,
			members: {
				...guild.members,
				me: { permissions: perms(PermissionFlagsBits.ManageWebhooks) }
			},
			fetchWebhooks: async () =>
				new Collection([
					[
						"1",
						{
							id: "1",
							name: "hook",
							type: 1,
							channelId: "2",
							owner: { id: "3" },
							applicationId: null,
							token: "SECRET",
							url: "https://discord.com/api/webhooks/1/SECRET",
							avatarURL: () => null,
							createdTimestamp: 5
						}
					]
				])
		};
		const out = await serverActions["audit.webhooks"].run(ctx(g, {}));
		expect(JSON.stringify(out)).not.toContain("SECRET");
		expect((out as any).webhooks[0].ownerId).toBe("3");
	});
});

describe("server actions: emojis", () => {
	const run = serverActions["emojis.create"].run;
	const image = PNG.toString("base64");

	test("needs the bot permission, a valid and free name", async () => {
		expect(
			await refused(run(ctx(fakeGuild([]), { name: "ok_name", image })))
		).toContain("Manage Expressions");
		const g = fakeGuild([], PermissionFlagsBits.ManageGuildExpressions);
		expect(
			await refused(run(ctx(g, { name: "bad name", image })))
		).toContain("invalid parameter: name");
		expect(await refused(run(ctx(g, { name: "taken", image })))).toBe(
			"an emoji with this name already exists"
		);
		expect(
			await refused(
				run(
					ctx(g, {
						name: "big",
						image: Buffer.alloc(300 * 1024).toString("base64")
					})
				)
			)
		).toContain("larger than 256 KiB");
	});
});

describe("server actions: backups", () => {
	test("a schedule counts from now and keeps the last run", () => {
		const s = buildSchedule(
			OWNER,
			{ every: 1, unit: "week" },
			["messages", "roles"],
			{ lastRunAt: 7 },
			1000
		);
		expect(s).toEqual({
			ownerId: OWNER,
			every: 1,
			unit: "week",
			components: ["roles", "channels", "messages"],
			nextRunAt: computeNextRun(1000, { every: 1, unit: "week" }),
			lastRunAt: 7,
			lastError: null
		});
	});

	test("load and delete only touch the author's own backups", async () => {
		const client = {
			db: { get: async () => false }, // /backup manage: open to admins
			backup: {
				getUserBackups: async () => ({ "900": { guildName: "g" } }),
				fetchBackup: async () => {
					throw new Error("missing");
				}
			}
		};
		const admin = fakeGuild([], PermissionFlagsBits.Administrator);
		expect(
			(await prepareBackupLoad(client as any, admin as any, ACTOR, "1"))
				.ok
		).toBe(false);
		expect(
			await refused(
				serverActions["backups.load"].run(
					ctx(admin, { id: "1" }, client)
				)
			)
		).toBe("backup not found");
		expect(
			await refused(
				serverActions["backups.load"].run(
					ctx(admin, { id: "900" }, client)
				)
			)
		).toBe("backup not found");
		expect(
			await refused(
				serverActions["backups.load"].run(
					ctx(fakeGuild([]), { id: "900" }, client)
				)
			)
		).toContain("Administrator");
		expect(
			await refused(
				serverActions["backups.delete"].run(
					ctx(admin, { id: "1" }, client)
				)
			)
		).toBe("backup not found");
		// Owner only by default.
		const closed = { ...client, db: { get: async () => undefined } };
		expect(
			await refused(
				serverActions["backups.load"].run(
					ctx(admin, { id: "900" }, closed)
				)
			)
		).toContain("forbidden");
	});

	test("schedule actions are for the server owner", () => {
		expect(serverActions["backups.schedule"].ownerOnly).toBe(true);
		expect(serverActions["backups.schedules"].ownerOnly).toBe(true);
	});
});

describe("server actions: automod and profile", () => {
	test("flags are written like the panel", () => {
		expect(automodFlagValue("media", true)).toBe(true);
		expect(automodFlagValue("spam", false)).toBe("off");
		expect(automodFlagValue("telegram", true)).toBe("on");
	});

	test("automod.set validates before touching Discord", async () => {
		const run = serverActions["automod.set"].run;
		const g = fakeGuild([], PermissionFlagsBits.ManageGuild);
		expect(await refused(run(ctx(g, { rule: "nope" })))).toBe(
			"invalid parameter: rule"
		);
		expect(
			await refused(run(ctx(g, { rule: "spam", mentionLimit: 5 })))
		).toContain("mass_mention");
		expect(
			await refused(
				run(ctx(g, { rule: "mass_mention", mentionLimit: 99 }))
			)
		).toContain("at most 50");
		expect(
			await refused(
				run(
					ctx(g, {
						rule: "spam",
						bypassRoles: ["599999999999999999"]
					})
				)
			)
		).toContain("not found");
		expect(
			await refused(
				run(ctx(fakeGuild([]), { rule: "spam", enabled: true }))
			)
		).toContain("Manage Server");
	});

	test("profile-set checks the bio before any call", async () => {
		const run = serverActions["bot.profile-set"].run;
		expect(await refused(run(ctx(fakeGuild([]), {})))).toBe(
			"nothing to change"
		);
		expect(
			await refused(run(ctx(fakeGuild([]), { bio: "x".repeat(400) })))
		).toContain("399");
		expect(await refused(run(ctx(fakeGuild([]), { bio: 3 })))).toBe(
			"invalid parameter: bio"
		);
	});
});
