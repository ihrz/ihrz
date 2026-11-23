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
	sendWarnsClearedLog,
	warnRefusal,
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

// A text channel; `everyone` = whether @everyone can view it.
function fakeChannel(name: string, everyone: boolean, sent: any[], id = name) {
	return {
		id,
		name,
		isTextBased: () => true,
		permissionsFor: () => ({ has: () => everyone }),
		send: async (p: any) => sent.push([id, p])
	};
}

function fakeServer(
	config: unknown,
	existing = 2,
	moderatable = true,
	opts: { channels?: (sent: any[]) => any[]; logsId?: string } = {}
) {
	const store: Record<string, any> = {
		"9.USER.2.WARNS": Array.from({ length: existing }, (_, i) => ({
			id: "w" + i,
			reason: "",
			authorID: "1",
			timestamp: Date.now()
		})),
		"9.GUILD.WARN_CONFIG": config,
		"9.GUILD.SERVER_LOGS.moderation": opts.logsId ?? null
	};
	const sent: any[] = [];
	const channels = opts.channels
		? opts.channels(sent)
		: [fakeChannel("mods", false, sent, "log")];
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
		ownerId: "0",
		roles: { everyone: { id: "9" } },
		channels: {
			cache: {
				find: (fn: (c: any) => boolean) => channels.find(fn),
				get: (id: string) => channels.find((c) => c.id === id)
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
		communicationDisabledUntilTimestamp: null as number | null,
		send: async (p: any) => sent.push(["dm", p]),
		timeout: async (ms: number) => sanctions.push(["timeout", ms]),
		kick: async () => sanctions.push(["kick"])
	};
	const author: any = {
		user: { id: "1", username: "mod" },
		toString: () => "<@1>"
	};
	for (const c of channels) c.guild = guild;
	return { store, sent, sanctions, member, author, guild };
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

const cardText = (p: any) =>
	JSON.stringify(p.components.map((c: any) => c.toJSON()));

describe("a threshold timeout never shortens a longer one", () => {
	const rule = {
		rules: [{ count: 3, action: "timeout", duration: 3_600_000 }]
	};

	test("a 2-day timeout already running is kept", async () => {
		const s = fakeServer(rule);
		const until = Date.now() + 2 * DAY;
		s.member.communicationDisabledUntilTimestamp = until;
		const issued = await issueWarn(s.author, s.member, "spam", enUS);
		expect(s.sanctions).toEqual([]);
		expect(issued.sanction).toEqual({
			rule: { count: 3, action: "timeout", duration: 3_600_000 },
			applied: true,
			keptUntil: until
		});
		const log = cardText(s.sent.find(([k]) => k === "log")![1]);
		const dm = cardText(s.sent.find(([k]) => k === "dm")![1]);
		const kept = `<t:${Math.floor(until / 1000)}:f>`;
		expect(log).toContain(kept);
		expect(dm).toContain(kept);
	});

	test("a shorter running timeout is replaced", async () => {
		const s = fakeServer(rule);
		s.member.communicationDisabledUntilTimestamp = Date.now() + 600_000;
		const issued = await issueWarn(s.author, s.member, "spam", enUS);
		expect(s.sanctions).toEqual([["timeout", 3_600_000]]);
		expect(issued.sanction?.keptUntil).toBeUndefined();
	});
});

describe("the staff log never goes to a public channel picked by name", () => {
	const note = "private staff note";

	test("a public mods channel is skipped for a hidden one", async () => {
		const s = fakeServer(null, 0, true, {
			channels: (sent) => [
				fakeChannel("mods-chat", true, sent),
				fakeChannel("mods-private", false, sent)
			]
		});
		await issueWarn(s.author, s.member, "spam", enUS, note);
		const logs = s.sent.filter(([k]) => k !== "dm");
		expect(logs.map(([k]) => k)).toEqual(["mods-private"]);
		expect(cardText(logs[0][1])).toContain(note);
	});

	test("a public ihorizon-logs or mods channel falls back to /setlogs", async () => {
		const s = fakeServer(null, 0, true, {
			logsId: "setlogs",
			channels: (sent) => [
				fakeChannel("ihorizon-logs", true, sent),
				fakeChannel("mods", true, sent),
				// Chosen by the admins: used even if public.
				fakeChannel("general", true, sent, "setlogs")
			]
		});
		s.guild.client.func.hasIhorizonLogs = () => true;
		await issueWarn(s.author, s.member, "spam", enUS, note);
		expect(s.sent.filter(([k]) => k !== "dm").map(([k]) => k)).toEqual([
			"setlogs"
		]);
	});

	test("only public channels and no /setlogs: no log at all", async () => {
		const s = fakeServer(null, 0, true, {
			channels: (sent) => [fakeChannel("mods", true, sent)]
		});
		await issueWarn(s.author, s.member, "spam", enUS, note);
		expect(s.sent.filter(([k]) => k !== "dm")).toEqual([]);
	});
});

describe("clearing warnings is logged", () => {
	test("one member: who, whom, how many", async () => {
		const s = fakeServer(null);
		expect(
			await sendWarnsClearedLog(
				s.guild,
				"<@1>",
				{ count: 4, member: "<@2>" },
				enUS
			)
		).toBe(true);
		const text = cardText(s.sent[0][1]);
		expect(text).toContain(enUS.clearwarn_card_title);
		expect(text).toContain("4 warnings of <@2>");
		expect(text).toContain("<@1>");
	});

	test("the whole server: how many warnings and members", async () => {
		const s = fakeServer(null);
		await sendWarnsClearedLog(
			s.guild,
			"<@1>",
			{ count: 7, members: 3 },
			enUS
		);
		const text = cardText(s.sent[0][1]);
		expect(text).toContain(enUS.clear_allwarns_card_title);
		expect(text).toContain("7 warnings of 3 members");
	});
});

describe("who can be warned", () => {
	const m = (id: string, position: number, bot = false): any => ({
		id,
		user: { id, bot },
		guild: { ownerId: "OWNER" },
		roles: { highest: { position } }
	});

	test("the server owner never, even by a higher role", () => {
		expect(warnRefusal(m("1", 50), m("OWNER", 1))).toBe("owner");
	});

	test("self, bots, equal or higher roles; the owner warns anyone", () => {
		expect(warnRefusal(m("1", 5), m("1", 5))).toBe("self");
		expect(warnRefusal(m("1", 5), m("2", 1, true))).toBe("bot");
		expect(warnRefusal(m("1", 5), m("2", 5))).toBe("above");
		expect(warnRefusal(m("OWNER", 1), m("2", 9))).toBeNull();
		expect(warnRefusal(m("1", 5), m("2", 4))).toBeNull();
	});
});
