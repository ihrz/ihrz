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

import { AuditLogEvent, PermissionFlagsBits } from "discord.js";

import { handleProtectionEntry } from "../../src/core/modules/protectionEngine.ts";

const MEMBER = "100";
const MODERATOR = "101";
const OFFERED = "200";
const OFFERED_ADMIN = "201";
const NOT_OFFERED = "202";

let guildSeq = 0;
let punished: string[];
let removed: string[];
let added: string[];

beforeEach(() => {
	punished = [];
	removed = [];
	added = [];

	(globalThis as any).client = {
		user: { id: "1" },
		db: {
			get: async (key: string) =>
				key.endsWith(".PROTECTION")
					? {
							SANCTION: "simply+derank",
							updatemember: { mode: "allowlist" },
							add_admin_roles: { mode: "allowlist" }
						}
					: null
		},
		func: {
			method: {
				punish: async (
					_protection: unknown,
					target: { id: string }
				) => {
					punished.push(target.id);
				}
			}
		},
		rest: {
			delete: async (route: string) => {
				removed.push(route.split("/").at(-1)!);
			},
			put: async (route: string) => {
				added.push(route.split("/").at(-1)!);
			}
		}
	};
});

// Other test files check for a global client to detect a running bot.
afterEach(() => {
	delete (globalThis as any).client;
});

function role(id: string, admin = false) {
	return {
		id,
		managed: false,
		position: 1,
		permissions: {
			has: (permission: bigint) =>
				admin && permission === PermissionFlagsBits.Administrator
		}
	};
}

function makeGuild(fetchOnboarding?: () => Promise<unknown>) {
	const offered = new Map([
		[OFFERED, {}],
		[OFFERED_ADMIN, {}]
	]);

	return {
		id: `protect-onboarding-${++guildSeq}`,
		ownerId: "999",
		roles: {
			cache: new Map([
				[OFFERED, role(OFFERED)],
				[OFFERED_ADMIN, role(OFFERED_ADMIN, true)],
				[NOT_OFFERED, role(NOT_OFFERED)]
			])
		},
		members: { me: { roles: { highest: { position: 10 } } } },
		fetchOnboarding:
			fetchOnboarding ??
			(async () => ({
				prompts: new Map([
					["p", { options: new Map([["o", { roles: offered }]]) }]
				])
			}))
	} as any;
}

function roleEntry(
	key: "$add" | "$remove",
	roleIds: string[],
	executorId = MEMBER,
	targetId = MEMBER
) {
	return {
		action: AuditLogEvent.MemberRoleUpdate,
		executorId,
		targetId,
		changes: [{ key, new: roleIds.map((id) => ({ id })) }]
	} as any;
}

test("a member picking or dropping an onboarding role is left alone", async () => {
	const guild = makeGuild();

	await handleProtectionEntry(roleEntry("$add", [OFFERED]), guild);
	await handleProtectionEntry(roleEntry("$remove", [OFFERED]), guild);

	expect(punished).toEqual([]);
	expect(removed).toEqual([]);
	expect(added).toEqual([]);
});

test("a role outside the onboarding still breaks the rule", async () => {
	await handleProtectionEntry(
		roleEntry("$add", [OFFERED, NOT_OFFERED]),
		makeGuild()
	);

	expect(punished).toEqual([MEMBER]);
	expect(removed).toEqual([OFFERED, NOT_OFFERED]);
});

test("giving an onboarding role to someone else still breaks the rule", async () => {
	await handleProtectionEntry(
		roleEntry("$add", [OFFERED], MODERATOR, MEMBER),
		makeGuild()
	);

	expect(punished).toEqual([MODERATOR]);
	expect(removed).toEqual([OFFERED]);
});

test("an onboarding role granting Administrator stays forbidden", async () => {
	await handleProtectionEntry(
		roleEntry("$add", [OFFERED_ADMIN]),
		makeGuild()
	);

	expect(punished).toEqual([MEMBER]);
	expect(removed).toEqual([OFFERED_ADMIN]);
});

test("the protection stays active when the onboarding cannot be read", async () => {
	let reads = 0;
	const guild = makeGuild(async () => {
		reads++;
		throw new Error("boom");
	});

	await handleProtectionEntry(roleEntry("$add", [OFFERED]), guild);

	expect(punished).toEqual([MEMBER]);

	// The failure is not remembered: the next entry reads again.
	await handleProtectionEntry(roleEntry("$add", [OFFERED]), guild);

	expect(reads).toBe(2);
});

test("the onboarding is read once, and again after it changed", async () => {
	let reads = 0;
	const guild = makeGuild(async () => {
		reads++;
		return {
			prompts: new Map([
				[
					"p",
					{
						options: new Map([
							["o", { roles: new Map([[OFFERED, {}]]) }]
						])
					}
				]
			])
		};
	});

	await handleProtectionEntry(roleEntry("$add", [OFFERED]), guild);
	await handleProtectionEntry(roleEntry("$remove", [OFFERED]), guild);

	expect(reads).toBe(1);

	await handleProtectionEntry(
		{
			action: AuditLogEvent.OnboardingPromptUpdate,
			executorId: MODERATOR,
			targetId: guild.id,
			changes: []
		} as any,
		guild
	);
	await handleProtectionEntry(roleEntry("$add", [OFFERED]), guild);

	expect(reads).toBe(2);
});
