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
import { MessageFlags } from "discord.js";

import enUS from "../../src/lang/en-US.ts";
import emojis from "../../src/files/emojis.json";
import {
	rewardCard,
	roleLines,
	roleListCard
} from "../../src/core/modules/economyCards.ts";
import * as economyLogs from "../../src/core/functions/economyLogs.ts";

const lang = enUS as any;

const fakeClient = (stored: unknown = null) =>
	({
		iHorizon_Emojis: emojis,
		db: { get: async () => stored },
		func: {
			displayBotName: {
				footerBuilder: async () => ({ text: "iHorizon", iconURL: "" })
			}
		}
	}) as any;

const json = (container: any) => JSON.stringify(container.toJSON());

describe("economy cards", () => {
	test("roles are listed most expensive first, with price and boost", () => {
		const lines = roleLines(
			fakeClient(),
			{ cheap: { price: 10 }, dear: { price: 500, boost: 2 } },
			lang
		).split("\n");
		expect(lines[0]).toContain("<@&dear>");
		expect(lines[1]).toContain("**500**");
		expect(lines[1]).toContain(`${lang.var_boost} **x2**`);
		expect(lines[2]).toContain("<@&cheap>");
		expect(lines[3]).toContain(`${lang.var_boost} **x1**`);
	});

	test("an empty shop says so instead of an empty card", async () => {
		const card = await roleListCard(fakeClient(), "9", {}, lang, {
			title: lang.economy_role_list_embed_title,
			description: lang.economy_role_list_embed_desc
		});
		expect(json(card)).toContain(lang.economy_role_list_no_buyable_roles);
	});

	test("a reward card shows the amount with the coin", async () => {
		const member = {
			guild: { id: "9" },
			displayAvatarURL: () => "https://cdn.discordapp.com/a.png"
		} as any;
		const card = json(
			await rewardCard(
				fakeClient(),
				member,
				lang,
				{
					title: lang.daily_embed_title,
					description: lang.daily_embed_description,
					label: lang.daily_embed_fields
				},
				750
			)
		);
		expect(card).toContain(lang.daily_embed_title);
		expect(card).toContain(`750${emojis.Coin}`);
		expect(card).toContain("iHorizon");
	});
});

describe("economy log channel", () => {
	const fakeGuild = (sent: any[], logs: string | null = "500") => {
		const client = fakeClient(logs);
		const channel = {
			guild: { id: "9", client },
			send: async (p: any) => sent.push(p)
		};
		return {
			id: "9",
			client,
			channels: {
				cache: new Map([["500", channel]]),
				fetch: async () => null
			}
		} as any;
	};

	test("a Components V2 card that pings nobody", async () => {
		const sent: any[] = [];
		await economyLogs.pay(fakeGuild(sent), "1", "2", 300, lang);
		expect(sent).toHaveLength(1);
		const [payload] = sent;
		expect(payload.flags).toEqual([MessageFlags.IsComponentsV2]);
		expect(payload.allowedMentions).toEqual({ parse: [] });
		expect(payload.embeds).toBeUndefined();
		const card = json(payload.components[0]);
		expect(card).toContain(lang.economy_logs_pay_title);
		expect(card).toContain("<@1>");
		expect(card).toContain("<@2>");
		expect(card).toContain("300");
	});

	test("no log channel, nothing sent", async () => {
		const sent: any[] = [];
		await economyLogs.deposit(fakeGuild(sent, null), "1", 5, lang);
		expect(sent).toHaveLength(0);
	});
});
