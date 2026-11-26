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
	AutoModerationRuleTriggerType,
	Collection,
	type AutoModerationRule,
	type Client,
	type Guild,
	type GuildMember
} from "discord.js";

import {
	findAntipubRule,
	setNativeRuleEnabled
} from "../../src/core/modules/automodRules.ts";
import { event as blockBot } from "../../src/Events/guildconfig/blockBot.ts";
import { event as tooNewAccount } from "../../src/Events/guildconfig/tooNewAccount.ts";

const GUILD = "100000000000000001";
const DISCORD_OWNER = "200000000000000001";
const LISTED_OWNER = "200000000000000002";
const STRANGER = "200000000000000003";
const BOT = "300000000000000001";

describe("bot blocker", () => {
	function setup(executorId: string) {
		const ban = mock(async () => {});
		const punish = mock(async () => {});
		const isGuildOwner = mock(
			async (userId: string) =>
				userId === DISCORD_OWNER || userId === LISTED_OWNER
		);
		const executor = { id: executorId };
		const guild = {
			id: GUILD,
			name: "Test",
			ownerId: DISCORD_OWNER,
			members: {
				me: { permissions: { has: () => true } },
				cache: new Collection([[executorId, executor]])
			},
			fetchAuditLogs: async () => ({
				entries: new Collection([
					[
						"1",
						{
							id: "1",
							targetId: BOT,
							executorId,
							executor: { toString: () => `<@${executorId}>` },
							createdTimestamp: Date.now()
						}
					]
				])
			})
		};
		const member = {
			id: BOT,
			user: { bot: true },
			guild,
			ban,
			toString: () => `<@${BOT}>`
		} as unknown as GuildMember;
		const client = {
			user: { id: "999" },
			db: { get: async () => true },
			func: {
				ownerHelper: { isGuildOwner },
				method: { punish },
				getLanguageData: async () =>
					new Proxy({}, { get: () => "text" }),
				displayBotName: {
					footerBuilder: async () => ({ text: "x" }),
					footerAttachmentBuilder: async () => ({})
				}
			}
		} as unknown as Client;
		globalThis.client = client;
		return { client, member, ban, punish };
	}

	test("a member of the server owner list may add a bot", async () => {
		const { client, member, ban, punish } = setup(LISTED_OWNER);
		await blockBot.run(client, member);
		expect(ban).not.toHaveBeenCalled();
		expect(punish).not.toHaveBeenCalled();
	});

	test("the Discord owner may add a bot", async () => {
		const { client, member, ban } = setup(DISCORD_OWNER);
		await blockBot.run(client, member);
		expect(ban).not.toHaveBeenCalled();
	});

	test("anyone else gets the bot banned and is deranked", async () => {
		const { client, member, ban, punish } = setup(STRANGER);
		await blockBot.run(client, member);
		expect(ban).toHaveBeenCalledTimes(1);
		expect(punish).toHaveBeenCalledTimes(1);
	});
});

describe("too-new account", () => {
	function setup(maxJoin: number | undefined) {
		const store = new Map<string, unknown>([
			[
				`${GUILD}.GUILD.BLOCK_NEW_ACCOUNT`,
				{ state: true, req: 7 * 24 * 3600 * 1000, maxJoin }
			]
		]);
		const ban = mock(async () => {});
		const kick = mock(async () => {});
		const member = {
			id: STRANGER,
			guild: { id: GUILD },
			user: { bot: false, createdAt: new Date() },
			ban,
			kick
		} as unknown as GuildMember;
		const client = {
			db: {
				get: async (key: string) => store.get(key),
				set: async (key: string, value: unknown) => {
					store.set(key, value);
				}
			}
		} as unknown as Client;
		return { client, member, ban, kick };
	}

	test("is banned on the Nth join, as the reply says", async () => {
		const { client, member, ban, kick } = setup(3);
		await tooNewAccount.run(client, member);
		await tooNewAccount.run(client, member);
		expect(kick).toHaveBeenCalledTimes(2);
		expect(ban).not.toHaveBeenCalled();
		await tooNewAccount.run(client, member);
		expect(ban).toHaveBeenCalledTimes(1);
		expect(kick).toHaveBeenCalledTimes(2);
	});

	test("a limit of 1 bans on the first join; no limit always kicks", async () => {
		const one = setup(1);
		await tooNewAccount.run(one.client, one.member);
		expect(one.ban).toHaveBeenCalledTimes(1);
		expect(one.kick).not.toHaveBeenCalled();

		const none = setup(undefined);
		for (let i = 0; i < 5; i++) {
			await tooNewAccount.run(none.client, none.member);
		}
		expect(none.ban).not.toHaveBeenCalled();
		expect(none.kick).toHaveBeenCalledTimes(5);
	});
});

describe("PunishPub bypass rule", () => {
	async function createdRules() {
		const create = mock(async () => {});
		const guild = {
			autoModerationRules: {
				fetch: async () => new Collection(),
				create
			},
			roles: { cache: new Collection() },
			channels: { cache: new Collection() }
		} as unknown as Guild;
		for (const key of ["telegram", "media", "antipub"] as const) {
			await setNativeRuleEnabled(guild, key, true, null);
		}
		return create.mock.calls.map((call, i) => {
			const data = (call as unknown[])[0] as Record<string, unknown>;
			return {
				id: String(i),
				name: data.name,
				triggerType: data.triggerType,
				triggerMetadata: data.triggerMetadata,
				exemptRoles: new Collection([[`role-${i}`, {}]])
			};
		});
	}

	test("takes the Links & advertising rule, not the first keyword rule", async () => {
		const [telegram, invites, links] = await createdRules();
		expect(telegram.triggerType).toBe(
			AutoModerationRuleTriggerType.Keyword
		);
		const found = findAntipubRule([
			telegram,
			invites,
			links
		] as unknown as Iterable<AutoModerationRule>);
		expect(found?.id).toBe(links.id);
		expect([...found!.exemptRoles.keys()]).toEqual(["role-2"]);
	});

	test("no Links & advertising rule: no bypass rule", async () => {
		const [telegram, invites] = await createdRules();
		expect(
			findAntipubRule([
				telegram,
				invites
			] as unknown as Iterable<AutoModerationRule>)
		).toBeUndefined();
	});
});
