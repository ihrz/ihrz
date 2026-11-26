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

// The owner list (and the Discord owner) passes the /perm RULES of a
// command, never the Discord permission of a command without a rule.

import { readyTables } from "../readyTables.ts";
import { afterEach, describe, expect, mock, test } from "bun:test";
import {
	type Client,
	type GuildMember,
	PermissionFlagsBits,
	PermissionsBitField
} from "discord.js";

mock.module("../../src/Events/client/ready.js", () => readyTables());

const { checkMemberCommandPermission } =
	await import("../../src/core/functions/permissonsCalculator.ts");
const { authorize } =
	await import("../../src/core/modules/gatewayLinkActions/index.ts");

const GUILD = "100000000000000000";
const DISCORD_OWNER = "200000000000000000";
const LISTED = "300000000000000000";
const OTHER = "400000000000000000";

const RULE = { PERMS: { ban: { users: [OTHER], roles: [], level: null } } };

function setup(utils: unknown, id: string, perms = 0n) {
	const client = {
		db: {
			get: async (key: string) => {
				if (key === `${GUILD}.UTILS`) return utils;
				if (key === `${GUILD}.OWNER.${LISTED}.owner`) return true;
				return null;
			}
		},
		func: {
			ownerHelper: { isGuildOwner: async () => false },
			helper: {
				cooldown: async () => false,
				getCooldownTimestamp: async () => null
			}
		},
		commands: new Map([
			["ban", { name: "ban", permission: PermissionFlagsBits.BanMembers }]
		]),
		subCommands: new Map()
	};
	globalThis.client = client as unknown as Client;
	const member = {
		id,
		client,
		guild: { id: GUILD, ownerId: DISCORD_OWNER },
		permissions: new PermissionsBitField(perms),
		roles: { cache: new Map() }
	};
	return {
		client: client as unknown as Client,
		member: member as unknown as GuildMember
	};
}

afterEach(() => {
	delete (globalThis as { client?: Client }).client;
});

describe("owner list and /perm rules", () => {
	for (const [who, id] of [
		["owner list member", LISTED],
		["Discord owner", DISCORD_OWNER]
	] as const) {
		test(`${who}: passes a command rule`, async () => {
			const { member } = setup(RULE, id);
			expect(
				(await checkMemberCommandPermission(member, "ban")).allowed
			).toBe(true);
		});

		test(`${who}: no rule => not decided here (Discord permission applies)`, async () => {
			// A UTILS document exists (other rules), none for this command.
			const withDoc = setup({ PERMS: { kick: 3 } }, id);
			expect(
				(await checkMemberCommandPermission(withDoc.member, "ban"))
					.allowed
			).toBe(false);
			// No UTILS document at all.
			const noDoc = setup(null, id);
			expect(
				(await checkMemberCommandPermission(noDoc.member, "ban"))
					.allowed
			).toBe(false);
		});
	}

	test("a regular member is still refused by a rule", async () => {
		const { member } = setup(RULE, "500000000000000000");
		expect(
			(await checkMemberCommandPermission(member, "ban")).allowed
		).toBe(false);
	});

	test("dashboard action: owner list without BanMembers is refused when /ban has no rule", async () => {
		const run = { command: "ban", run: async () => 0 };
		const denied = setup({ PERMS: {} }, LISTED);
		const err = await authorize(denied.client, denied.member, run).then(
			() => null,
			(e: Error) => e
		);
		expect(err?.message).toContain("requires");

		const withPerm = setup(
			{ PERMS: {} },
			LISTED,
			PermissionFlagsBits.BanMembers
		);
		await authorize(withPerm.client, withPerm.member, run);

		const ruled = setup(RULE, LISTED);
		await authorize(ruled.client, ruled.member, run);
	});
});
