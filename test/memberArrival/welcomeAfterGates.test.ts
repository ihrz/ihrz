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

import { beforeEach, describe, expect, mock, test } from "bun:test";

import { Collection, type Client, type GuildMember } from "discord.js";

import { readyTables } from "../readyTables.ts";

mock.module("../../src/Events/client/ready.js", () => readyTables());

const arrival = await import("../../src/core/modules/memberArrival.ts");
// Importing the join event registers the real welcome steps: replaced below.
const { trackArrivalInvite } =
	await import("../../src/Events/guildconfig/joinMessage.ts");
const { event: leaveMessage } =
	await import("../../src/Events/guildconfig/leaveMessage.ts");
const { event: roleSaverLeave } =
	await import("../../src/Events/rolesaver/onMemberLeave.ts");

const GUILD = "100000000000000010";
const GRACE = 30;

let joined = 1_700_000_000_000;
function newMember(id = "200000000000000010") {
	return {
		id,
		user: { id, bot: false },
		joinedTimestamp: ++joined,
		guild: { id: GUILD }
	} as unknown as GuildMember;
}

const client = {} as Client;
let calls: { step: string; ctx: unknown }[];

beforeEach(() => {
	arrival.resetArrivals();
	arrival.setArrivalTimings({ graceMs: GRACE, holdCapMs: 500 });
	calls = [];
	arrival.setWelcomeSteps({
		roles: [
			async (_c, _m, ctx) => calls.push({ step: "roles", ctx }),
			async (_c, _m, ctx) => calls.push({ step: "rolesaver", ctx })
		],
		messages: [
			async (_c, _m, ctx) => calls.push({ step: "welcome", ctx }),
			async (_c, _m, ctx) => calls.push({ step: "dm", ctx })
		]
	});
});

/** What the captcha event does on join, without Discord. */
function captchaPosted(member: GuildMember) {
	const release = arrival.holdArrival(member);
	arrival.markCaptchaPending(member);
	release();
}

describe("welcome side and the captcha", () => {
	test("deferred until the captcha is passed, then run with the join context", async () => {
		const member = newMember();
		arrival.beginArrival(member);
		captchaPosted(member);
		const ctx = {
			invite: { code: "abc", inviterId: "300", inviterUsername: "inv" }
		};

		expect(await arrival.settleArrival(client, member, ctx)).toBe(
			"captcha"
		);
		expect(calls).toHaveLength(0);

		await arrival.captchaPassed(member, "pending-role");
		expect(calls.map((c) => c.step)).toEqual([
			"roles",
			"rolesaver",
			"welcome",
			"dm"
		]);
		// The inviter credited on join is still the one welcomed.
		// The captcha's "Pending" role is passed on, so it isn't given back.
		for (const call of calls)
			expect(call.ctx).toEqual({
				...ctx,
				captchaRemovedRole: "pending-role"
			});
		// Welcomed: a leave afterwards is announced.
		expect(arrival.noteDeparture(member)).toBe(true);
	});

	test("captcha solved during the grace: welcomed once the grace ends", async () => {
		const member = newMember();
		arrival.beginArrival(member);
		captchaPosted(member);
		await arrival.captchaPassed(member);
		expect(calls).toHaveLength(0);
		expect(await arrival.settleArrival(client, member, {})).toBe(
			"welcomed"
		);
		expect(calls).toHaveLength(4);
	});

	test("captcha failed: nothing runs, no leave message", async () => {
		const member = newMember();
		arrival.beginArrival(member);
		captchaPosted(member);
		await arrival.settleArrival(client, member, {});
		arrival.markRejected(member); // collector end, before the kick
		await arrival.captchaPassed(member);
		expect(calls).toHaveLength(0);
		expect(arrival.noteDeparture(member)).toBe(false);
	});

	test("left during the captcha: nothing runs, no leave message", async () => {
		const member = newMember();
		arrival.beginArrival(member);
		captchaPosted(member);
		await arrival.settleArrival(client, member, {});
		expect(arrival.noteDeparture(member)).toBe(false);
		// Every leave listener (goodbye, role saver) gets the same answer.
		expect(arrival.noteDeparture(member)).toBe(false);
		await arrival.captchaPassed(member);
		expect(calls).toHaveLength(0);
	});
});

describe("welcome side and the gates", () => {
	test("no captcha: runs once the grace is over", async () => {
		const member = newMember();
		const started = Date.now();
		arrival.beginArrival(member);
		expect(await arrival.settleArrival(client, member, {}, started)).toBe(
			"welcomed"
		);
		expect(Date.now() - started).toBeGreaterThanOrEqual(GRACE - 2);
		expect(calls).toHaveLength(4);
		expect(arrival.noteDeparture(member)).toBe(true);
	});

	test("a gate that rejects during the grace: no welcome side, no leave message", async () => {
		const member = newMember();
		arrival.beginArrival(member);
		const release = arrival.holdArrival(member);
		setTimeout(() => {
			arrival.markRejected(member);
			release();
		}, 5);
		expect(await arrival.settleArrival(client, member, {})).toBe(
			"rejected"
		);
		expect(calls).toHaveLength(0);
		expect(arrival.noteDeparture(member)).toBe(false);
	});

	test("a gate still checking after the grace is waited for", async () => {
		const member = newMember();
		arrival.beginArrival(member);
		const release = arrival.holdArrival(member);
		setTimeout(() => {
			arrival.markRejected(member);
			release();
		}, GRACE * 3);
		expect(await arrival.settleArrival(client, member, {})).toBe(
			"rejected"
		);
		expect(calls).toHaveLength(0);
	});

	test("a gate that lets the member in: welcomed", async () => {
		const member = newMember();
		arrival.beginArrival(member);
		const release = arrival.holdArrival(member);
		setTimeout(release, 5);
		expect(await arrival.settleArrival(client, member, {})).toBe(
			"welcomed"
		);
		expect(calls).toHaveLength(4);
	});

	test("a rejection does not follow the member to their next join", async () => {
		const first = newMember("200000000000000011");
		arrival.beginArrival(first);
		arrival.markRejected(first);
		const again = {
			...first,
			joinedTimestamp: ++joined
		} as unknown as GuildMember;
		arrival.beginArrival(again);
		expect(arrival.isRejected(again)).toBe(false);
		expect(await arrival.settleArrival(client, again, {})).toBe("welcomed");
	});

	test("a repeated join event welcomes once", async () => {
		const member = newMember();
		arrival.beginArrival(member);
		const results = await Promise.all([
			arrival.settleArrival(client, member, {}),
			arrival.settleArrival(client, member, {})
		]);
		expect(results.sort()).toEqual(["duplicate", "welcomed"]);
		expect(calls).toHaveLength(4);
	});

	test("left during the grace: nothing runs", async () => {
		const member = newMember();
		arrival.beginArrival(member);
		const settled = arrival.settleArrival(client, member, {});
		expect(arrival.noteDeparture(member)).toBe(false);
		expect(await settled).toBe("left");
		expect(calls).toHaveLength(0);
	});
});

describe("invite tracking stays on join", () => {
	test("credited at once, and the inviter is kept for the welcome", async () => {
		const adds: string[] = [];
		const member = {
			id: "200000000000000020",
			user: { id: "200000000000000020" },
			guild: {
				id: "100000000000000020",
				name: "g",
				features: [],
				members: { me: { permissions: { has: () => true } } },
				invites: {
					fetch: async () =>
						new Collection([
							[
								"used",
								{
									code: "used",
									uses: 5,
									inviterId: "300",
									inviter: { username: "inviter" }
								}
							]
						])
				},
				client: { invites: new Collection() }
			}
		} as unknown as GuildMember;
		const fakeClient = {
			invites: new Collection([
				[
					"100000000000000020",
					new Collection([
						[
							"used",
							{ uses: 4, inviterId: "300", inviterUsername: null }
						]
					])
				]
			]),
			db: {
				get: async () => null,
				set: async () => undefined,
				add: async (key: string) => {
					adds.push(key);
				}
			}
		} as unknown as Client;
		(member.guild as unknown as { client: Client }).client = fakeClient;

		const ctx = await trackArrivalInvite(fakeClient, member);
		expect(ctx.invite).toEqual({
			code: "used",
			inviterId: "300",
			inviterUsername: "inviter"
		});
		expect(adds).toContain("100000000000000020.USER.300.INVITES.invites");
	});
});

describe("leave message", () => {
	function setup(member: GuildMember) {
		const sent: string[] = [];
		const channel = { id: "chan" };
		const m = member as unknown as Record<string, unknown>;
		m.guild = {
			id: GUILD,
			channels: { cache: new Collection([["chan", channel]]) }
		};
		m.user = {
			id: member.id,
			toString: () => `<@${member.id}>`,
			username: "u"
		};
		m.client = {
			func: {
				welcomerMessage: async () => {
					sent.push("goodbye");
				}
			}
		};
		const fake = {
			func: {
				getLanguageData: async () => ({
					event_goodbye_default: "bye",
					event_goodbye_inviter: "bye"
				}),
				method: { generateCustomMessagePreview: (s: string) => s }
			},
			db: {
				get: async (key: string) =>
					key.endsWith("GUILD_CONFIG.leave") ? "chan" : null
			},
			users: { cache: new Collection() }
		} as unknown as Client;
		return { sent, fake };
	}

	test("a member turned away by a gate gets no goodbye", async () => {
		const member = newMember("200000000000000030");
		arrival.beginArrival(member);
		arrival.markRejected(member);
		const { sent, fake } = setup(member);
		await leaveMessage.run(fake, member);
		expect(sent).toHaveLength(0);
	});

	test("a welcomed member gets one", async () => {
		const member = newMember("200000000000000031");
		arrival.beginArrival(member);
		await arrival.settleArrival(client, member, {});
		const { sent, fake } = setup(member);
		await leaveMessage.run(fake, member);
		expect(sent).toEqual(["goodbye"]);
	});
});

describe("role saver on leave", () => {
	test("a member who failed the captcha keeps their previous note", async () => {
		const member = newMember("200000000000000040");
		arrival.beginArrival(member);
		captchaPosted(member);
		await arrival.settleArrival(client, member, {});
		arrival.markRejected(member);
		const set = mock(async () => undefined);
		const fake = {
			db: { get: async () => true, set }
		} as unknown as Client;
		await roleSaverLeave.run(fake, member);
		expect(set).not.toHaveBeenCalled();
	});
});
