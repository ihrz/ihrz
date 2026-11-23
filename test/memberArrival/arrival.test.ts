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

import {
	Collection,
	type Client,
	type Guild,
	type GuildMember
} from "discord.js";

import { readyTables } from "../readyTables.ts";

mock.module("../../src/Events/client/ready.js", () => readyTables());

const { event: joinRole } =
	await import("../../src/Events/guildconfig/joinRole.ts");
const { resolveInvite } =
	await import("../../src/Events/guildconfig/joinMessage.ts");
const { bannerStateFrom } =
	await import("../../src/Interaction/SlashCommands/guildconfig/welcomerPanel.ts");

const GUILD = "100000000000000001";

describe("join roles", () => {
	function setup(roleIds: string[]) {
		const add = mock(async (_roles: unknown, _reason?: string) => {});
		const roles = new Collection<
			string,
			{ position: number; managed: boolean }
		>([
			["10", { position: 2, managed: false }],
			["11", { position: 3, managed: false }],
			["12", { position: 9, managed: false }], // above the bot
			["13", { position: 1, managed: true }] // booster / integration
		]);
		const member = {
			id: "200000000000000001",
			guild: {
				id: GUILD,
				members: {
					me: {
						permissions: { has: () => true },
						roles: { highest: { position: 5 } }
					}
				},
				roles: { cache: roles }
			},
			roles: { add }
		} as unknown as GuildMember;
		const client = {
			db: { get: async () => roleIds }
		} as unknown as Client;
		return { add, member, client };
	}

	test("one deleted or too high role no longer costs the member every join role", async () => {
		const { add, member, client } = setup(["10", "99", "12", "13", "11"]);
		await joinRole.run(client, member);
		expect(add).toHaveBeenCalledTimes(1);
		expect(add.mock.calls[0][0]).toEqual(["10", "11"]);
	});

	test("nothing left to give: no request", async () => {
		const { add, member, client } = setup(["99", "12"]);
		await joinRole.run(client, member);
		expect(add).not.toHaveBeenCalled();
	});
});

describe("invite tracking", () => {
	// Each test its own guild: invite fetches are shared per guild for 1.5 s.
	function guildWith(id: string, uses: Record<string, number>) {
		const invites = new Collection(
			Object.entries(uses).map(([code, n]) => [
				code,
				{ code, uses: n, inviterId: `inviter-${code}`, inviter: null }
			])
		);
		const cache = new Collection<string, unknown>();
		const guild = {
			id,
			invites: { fetch: async () => invites },
			client: { invites: cache }
		} as unknown as Guild;
		return { guild, cache };
	}

	test("without a snapshot of the counts, nobody is credited and the snapshot is taken", async () => {
		const { guild, cache } = guildWith("100000000000000002", {
			old: 40,
			other: 3
		});
		expect(await resolveInvite(guild, undefined)).toBeNull();
		expect(cache.has("100000000000000002")).toBe(true);
	});

	test("with a snapshot, the invite whose count went up is credited", async () => {
		const { guild } = guildWith("100000000000000003", { old: 40, used: 4 });
		const before = new Collection([
			[
				"old",
				{ uses: 40, inviterId: "inviter-old", inviterUsername: null }
			],
			[
				"used",
				{ uses: 3, inviterId: "inviter-used", inviterUsername: null }
			]
		]);
		const invite = await resolveInvite(guild, before as never);
		expect(invite?.code).toBe("used");
	});
});

describe("welcome card state", () => {
	test("an unset state is off, as the join event reads it", () => {
		expect(bannerStateFrom(undefined)).toBe("off");
		expect(bannerStateFrom(null)).toBe("off");
		expect(bannerStateFrom("off")).toBe("off");
		expect(bannerStateFrom("on")).toBe("on");
	});
});
