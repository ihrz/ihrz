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

// /mod unwarn, clearwarn, clear-all-warns and the dashboard's warns.* actions:
// the owner guard, the clear logs, the unwarn error message.

import { describe, expect, mock, test } from "bun:test";

import enUS from "../../src/lang/en-US.ts";
import emojis from "../../src/files/emojis.json";

// The confirmation of clear-all-warns: always "yes" here (no test imports it).
mock.module("../../src/core/functions/awaitingResponse.js", () => ({
	default: async () => true
}));

const { subCommand: unwarn } =
	await import("../../src/Interaction/HybridCommands/moderation/!unwarn.ts");
const { subCommand: clearwarn } =
	await import("../../src/Interaction/HybridCommands/moderation/!clearwarn.ts");
const { subCommand: clearAll } =
	await import("../../src/Interaction/HybridCommands/moderation/!clear-all-warns.ts");
const { moderationActions } =
	await import("../../src/core/modules/gatewayLinkActions/moderation.ts");
const { Params } =
	await import("../../src/core/modules/gatewayLinkActions/types.ts");

const GUILD = "100000000000000000";
const OWNER = "200000000000000000";
const MOD = "300000000000000000";
const TARGET = "400000000000000000";
const OTHER = "500000000000000000";

const cardText = (p: any) =>
	JSON.stringify(p.components.map((c: any) => c.toJSON()));

function server() {
	const store: Record<string, any> = {
		[GUILD]: {
			USER: {
				[TARGET]: {
					WARNS: [
						{ id: "AAA", reason: "r", authorID: MOD, timestamp: 1 },
						{ id: "BBB", reason: "r", authorID: MOD, timestamp: 2 }
					]
				},
				[OTHER]: {
					WARNS: [
						{ id: "CCC", reason: "r", authorID: MOD, timestamp: 3 }
					]
				}
			}
		}
	};
	// Flat paths over the nested object, as HorizonDB does.
	const path = (k: string) => k.split(".");
	const db = {
		get: async (k: string) =>
			path(k).reduce((o: any, p) => (o == null ? o : o[p]), store) ??
			null,
		set: async (k: string, v: any) => {
			const parts = path(k);
			const last = parts.pop()!;
			let o: any = store;
			for (const p of parts) o = o[p] ??= {};
			o[last] = v;
		},
		delete: async (k: string) => {
			const parts = path(k);
			const last = parts.pop()!;
			const o = parts.reduce((o: any, p) => o?.[p], store);
			if (o) delete o[last];
		}
	};
	const logs: any[] = [];
	const replies: any[] = [];
	const client: any = {
		user: { id: "9" },
		iHorizon_Emojis: emojis,
		db,
		func: {
			hasIhorizonLogs: () => false,
			ihorizon_logs: async () => {},
			displayBotName: {
				footerBuilder: async () => ({ text: "iHorizon", iconURL: "" })
			},
			method: {
				interactionSend: async (_i: any, p: any) => replies.push(p)
			}
		}
	};
	const staff = {
		id: "C1",
		name: "mods",
		isTextBased: () => true,
		permissionsFor: () => ({ has: () => false }),
		send: async (p: any) => logs.push(p)
	};
	const guild: any = {
		id: GUILD,
		ownerId: OWNER,
		client,
		roles: { everyone: { id: GUILD } },
		channels: {
			cache: {
				find: (fn: any) => [staff].find(fn),
				get: () => undefined
			}
		}
	};
	(staff as any).guild = guild;
	const member = (id: string, position: number): any => ({
		id,
		guild,
		user: { id, bot: false, username: "u" + id.slice(0, 1) },
		roles: { highest: { position } },
		toString: () => `<@${id}>`,
		displayAvatarURL: () => "https://cdn.discordapp.com/a.png"
	});
	const members = new Map(
		[
			member(OWNER, 1),
			member(MOD, 10),
			member(TARGET, 2),
			member(OTHER, 2)
		].map((m) => [m.id, m])
	);
	guild.members = {
		cache: members,
		fetch: async (id: string) => {
			const m = members.get(id);
			if (!m) throw new Error("unknown");
			return m;
		}
	};
	const interaction = (): any => ({
		member: members.get(MOD),
		guild,
		guildId: GUILD,
		channel: {}
	});
	client.func.method.options = (_i: any, _a: any) => ({
		member: () => optsMember,
		longString: () => optsText
	});
	let optsMember: any = null;
	let optsText = "";
	const setOpts = (m: any, t = "") => {
		optsMember = m;
		optsText = t;
	};
	const ctx = (params: Record<string, unknown>, actor = MOD): any => ({
		client,
		guild,
		actor: members.get(actor),
		params: new Params(params),
		lang: enUS
	});
	return {
		store,
		logs,
		replies,
		client,
		guild,
		members,
		interaction,
		setOpts,
		ctx
	};
}

describe("/mod unwarn", () => {
	test("an unknown warn ID names the member, not the moderator", async () => {
		const s = server();
		s.setOpts(s.members.get(TARGET), "nope");
		await unwarn.run(s.client, s.interaction(), enUS as any);
		expect(s.replies[0].content).toContain(`<@${TARGET}>`);
		expect(s.replies[0].content).not.toContain(`<@${MOD}>`);
	});
});

describe("clearing warnings posts a staff log", () => {
	test("/mod clearwarn", async () => {
		const s = server();
		s.setOpts(s.members.get(TARGET));
		await clearwarn.run(s.client, s.interaction(), enUS as any);
		expect(s.logs).toHaveLength(1);
		const text = cardText(s.logs[0]);
		expect(text).toContain(`2 warnings of <@${TARGET}>`);
		expect(text).toContain(`<@${MOD}>`);
		expect(s.store[GUILD].USER[TARGET].WARNS).toBeUndefined();
		expect(s.store[GUILD].USER[OTHER].WARNS).toHaveLength(1);
	});

	test("/mod clear-all-warns", async () => {
		const s = server();
		await clearAll.run(s.client, s.interaction(), enUS as any);
		expect(s.logs).toHaveLength(1);
		expect(cardText(s.logs[0])).toContain("3 warnings of 2 members");
		expect(s.store[GUILD].USER[OTHER].WARNS).toBeUndefined();
	});

	test("the dashboard's clear action", async () => {
		const s = server();
		expect(
			await moderationActions["warns.clear"].run(
				s.ctx({ userId: TARGET })
			)
		).toEqual({ cleared: 2 });
		expect(s.logs).toHaveLength(1);
		expect(cardText(s.logs[0])).toContain(`2 warnings of <@${TARGET}>`);
	});
});

describe("the server owner cannot be warned", () => {
	test("from the dashboard, even by a higher role", async () => {
		const s = server();
		await expect(
			moderationActions["warns.add"].run(
				s.ctx({ userId: OWNER, reason: "x" })
			)
		).rejects.toThrow("forbidden: the server owner cannot be warned");
	});
});
