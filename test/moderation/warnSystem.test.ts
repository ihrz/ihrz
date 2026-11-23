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

import enUS from "../../src/lang/en-US.ts";
import emojis from "../../src/files/emojis.json";
import {
	activeWarns,
	issueWarn,
	normalizeWarnConfig,
	ruleForCount,
	validateWarnConfig
} from "../../src/core/modules/warnSystem.ts";

const DAY = 86_400_000;

describe("warn settings", () => {
	test("broken rules are dropped, one rule per count, sorted", () => {
		expect(
			normalizeWarnConfig({
				expireDays: 30,
				rules: [
					{ count: 5, action: "kick" },
					{ count: 3, action: "timeout", duration: 3_600_000 },
					{ count: 3, action: "ban" },
					{ count: 7, action: "timeout" },
					{ count: 0, action: "ban" },
					{ count: 9, action: "nuke" }
				]
			})
		).toEqual({
			expireDays: 30,
			rules: [
				{ count: 3, action: "timeout", duration: 3_600_000 },
				{ count: 5, action: "kick" }
			]
		});
		expect(normalizeWarnConfig(null)).toEqual({ expireDays: 0, rules: [] });
	});

	test("the dashboard's check refuses what the bot would drop", () => {
		expect(
			validateWarnConfig({
				expireDays: 0,
				rules: [{ count: 3, action: "ban" }]
			})
		).toBeNull();
		expect(validateWarnConfig({ expireDays: 400 })).not.toBeNull();
		expect(
			validateWarnConfig({ rules: [{ count: 3, action: "timeout" }] })
		).not.toBeNull();
		expect(
			validateWarnConfig({
				rules: [
					{ count: 3, action: "kick" },
					{ count: 3, action: "ban" }
				]
			})
		).not.toBeNull();
		expect(
			validateWarnConfig({
				rules: Array.from({ length: 11 }, (_, i) => ({
					count: i + 1,
					action: "kick"
				}))
			})
		).not.toBeNull();
		expect(validateWarnConfig([])).not.toBeNull();
	});

	test("expired warnings stop counting; a threshold is reached exactly once", () => {
		const now = 100 * DAY;
		const warns = [
			{ id: "a", reason: "", authorID: "1", timestamp: now - 40 * DAY },
			{ id: "b", reason: "", authorID: "1", timestamp: now - 2 * DAY }
		];
		expect(
			activeWarns(warns, { expireDays: 30, rules: [] }, now).map(
				(w) => w.id
			)
		).toEqual(["b"]);
		expect(
			activeWarns(warns, { expireDays: 0, rules: [] }, now)
		).toHaveLength(2);
		const config = normalizeWarnConfig({
			rules: [{ count: 3, action: "kick" }]
		});
		expect(ruleForCount(config, 3)?.action).toBe("kick");
		expect(ruleForCount(config, 4)).toBeNull();
	});
});

function fakeServer(config: unknown, existing = 2, moderatable = true) {
	const store: Record<string, any> = {
		"9.USER.2.WARNS": Array.from({ length: existing }, (_, i) => ({
			id: "w" + i,
			reason: "",
			authorID: "1",
			timestamp: Date.now()
		})),
		"9.GUILD.WARN_CONFIG": config
	};
	const sent: any[] = [];
	const sanctions: any[] = [];
	const client: any = {
		iHorizon_Emojis: emojis,
		timeCalculator: { to_beautiful_string: () => "1h" },
		db: {
			get: async (k: string) => store[k] ?? null,
			set: async (k: string, v: any) => (store[k] = v),
			push: async (k: string, v: any) =>
				(store[k] = [...(store[k] ?? []), v])
		},
		func: {
			hasIhorizonLogs: () => false,
			displayBotName: {
				footerBuilder: async () => ({ text: "iHorizon", iconURL: "" })
			}
		}
	};
	const guild: any = {
		id: "9",
		name: "Server one",
		client,
		iconURL: () => null,
		channels: {
			cache: {
				find: () => ({
					isTextBased: () => true,
					send: async (p: any) => sent.push(["log", p])
				}),
				get: () => undefined
			}
		},
		bans: { create: async (id: string) => sanctions.push(["ban", id]) }
	};
	const member: any = {
		id: "2",
		guild,
		moderatable,
		kickable: moderatable,
		bannable: moderatable,
		toString: () => "<@2>",
		displayAvatarURL: () => "https://cdn.discordapp.com/a.png",
		send: async (p: any) => sent.push(["dm", p]),
		timeout: async (ms: number) => sanctions.push(["timeout", ms]),
		kick: async () => sanctions.push(["kick"])
	};
	const author: any = {
		user: { id: "1", username: "mod" },
		toString: () => "<@1>"
	};
	return { store, sent, sanctions, member, author };
}

describe("issueWarn", () => {
	test("the third warning applies the threshold's timeout; the note stays with the staff", async () => {
		const s = fakeServer({
			rules: [{ count: 3, action: "timeout", duration: 3_600_000 }]
		});
		const issued = await issueWarn(
			s.author,
			s.member,
			"spam",
			enUS,
			"repeat offender"
		);
		expect(issued.active).toBe(3);
		expect(issued.warn.note).toBe("repeat offender");
		expect(issued.sanction).toEqual({
			rule: { count: 3, action: "timeout", duration: 3_600_000 },
			applied: true
		});
		expect(s.sanctions).toEqual([["timeout", 3_600_000]]);
		const dm = JSON.stringify(
			s.sent.find(([k]) => k === "dm")![1].components[0].toJSON()
		);
		const log = JSON.stringify(
			s.sent.find(([k]) => k === "log")![1].components[0].toJSON()
		);
		expect(dm).not.toContain("repeat offender");
		expect(log).toContain("repeat offender");
		expect(log).toContain("Timeout (1h)");
		expect(s.store["9.USER.2.WARNS"]).toHaveLength(3);
	});

	test("a sanction the bot cannot apply is reported, not thrown", async () => {
		const s = fakeServer(
			{ rules: [{ count: 3, action: "ban" }] },
			2,
			false
		);
		const issued = await issueWarn(s.author, s.member, "spam", enUS);
		expect(issued.sanction?.applied).toBe(false);
		expect(s.sanctions).toEqual([]);
		expect(issued.warn.note).toBeUndefined();
	});

	test("no rule for this count, no sanction", async () => {
		const s = fakeServer({ rules: [{ count: 5, action: "kick" }] });
		const issued = await issueWarn(s.author, s.member, "spam", enUS);
		expect(issued.sanction).toBeNull();
		expect(s.sanctions).toEqual([]);
	});
});
