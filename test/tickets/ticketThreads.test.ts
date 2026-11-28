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
import {
	ChannelType,
	Collection,
	PermissionFlagsBits,
	PermissionsBitField
} from "discord.js";

import {
	MAX_THREAD_STAFF,
	archiveThread,
	lockThread,
	createTicketThread,
	ensureThreadHub,
	threadTicketSummary,
	SUMMARY_MAX,
	fetchTicketChannel,
	isThreadStaff,
	missingThreadPermissions,
	removeThreadMember,
	reopenThread,
	staffMembers,
	staffRoleIds,
	threadStaffCheck,
	threadParentId
} from "../../src/core/modules/ticketThreads.ts";

const GUILD = "100000000000000000";
const BOT = "900000000000000000";
const perms = (...bits: bigint[]) =>
	new PermissionsBitField(bits.reduce((a, b) => a | b, 0n));

/** Roles: id → [managed, permission on the parent channel]. */
function fakeParent(
	roles: Record<string, { managed?: boolean; perm: bigint }>,
	botPerm: bigint
) {
	const roleCache = new Map(
		Object.entries(roles).map(([id, r]) => [
			id,
			{ id, managed: !!r.managed }
		])
	);
	const created: unknown[] = [];
	const added: string[] = [];
	const thread = {
		id: "800000000000000000",
		members: { add: async (id: string) => void added.push(id) }
	};
	const guild = {
		id: GUILD,
		members: { me: { id: BOT } },
		roles: {
			cache: {
				filter: (
					fn: (r: { id: string; managed: boolean }) => boolean
				) => ({
					map: (m: (r: { id: string }) => string) =>
						[...roleCache.values()].filter(fn).map(m)
				})
			}
		}
	};
	const parent = {
		guild,
		permissionsFor: (who: { id: string }, checkAdmin?: boolean) => {
			if (who.id === BOT) return perms(botPerm);
			// checkAdmin=false: Administrator alone does not count.
			expect(checkAdmin).toBe(false);
			return perms(roles[who.id]?.perm ?? 0n);
		},
		threads: {
			create: async (options: unknown) => {
				created.push(options);
				return thread;
			}
		}
	};
	return { parent, created, added };
}

describe("ticket threads: settings", () => {
	test("the option's channel, else the panel's, else the panel message's", () => {
		expect(
			threadParentId(
				{ threadChannel: "2" },
				{ threadChannelId: "1" },
				"3"
			)
		).toBe("1");
		expect(threadParentId({ threadChannel: "2" }, {}, "3")).toBe("2");
		expect(threadParentId({ threadChannel: null }, undefined, "3")).toBe(
			"3"
		);
	});

	test("missing bot permissions are named", () => {
		const { parent } = fakeParent(
			{},
			PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages
		);
		expect(missingThreadPermissions(parent as never)).toEqual([
			"CreatePrivateThreads",
			"SendMessagesInThreads",
			"ManageThreads",
			"EmbedLinks"
		]);
	});
});

describe("ticket threads: staff", () => {
	test("roles that manage threads on the channel + the roles to ping", () => {
		const { parent } = fakeParent(
			{
				[GUILD]: { perm: PermissionFlagsBits.ManageThreads }, // @everyone
				"11": { perm: PermissionFlagsBits.ManageThreads },
				"12": {
					perm: PermissionFlagsBits.ManageThreads,
					managed: true
				},
				"13": { perm: PermissionFlagsBits.ViewChannel }
			},
			0n
		);
		expect(staffRoleIds(parent as never, ["13", "11", "14"])).toEqual([
			"11",
			"13",
			"14"
		]);
	});

	test("an Administrator role is thread staff, as it sees every ticket channel", () => {
		const { parent } = fakeParent(
			{
				"21": { perm: PermissionFlagsBits.Administrator },
				"22": { perm: PermissionFlagsBits.ManageThreads }
			},
			0n
		);
		expect(staffRoleIds(parent as never, [])).toEqual(["21", "22"]);
	});

	test("human members of the roles, author left out, capped", async () => {
		const member = (id: string, bot = false) => [id, { id, user: { bot } }];
		const many = Array.from({ length: MAX_THREAD_STAFF + 10 }, (_, i) =>
			member(`5${i}`)
		);
		let fetched = 0;
		const guild = {
			memberCount: 3,
			members: {
				cache: { size: 1 },
				fetch: async () => void fetched++
			},
			roles: {
				cache: new Map([
					[
						"11",
						{
							members: new Map([
								member("1"),
								member("2", true),
								member("3")
							] as never)
						}
					],
					["12", { members: new Map(many as never) }]
				])
			}
		};
		const ids = await staffMembers(
			guild as never,
			["11", "404", "12"],
			new Set(["3"])
		);
		expect(fetched).toBe(1); // cache incomplete: filled once
		expect(ids.slice(0, 2)).toEqual(["1", "50"]);
		expect(ids).toHaveLength(MAX_THREAD_STAFF);
		expect(await staffMembers(guild as never, [], new Set())).toEqual([]);
	});

	test("a private, non-invitable thread with the author then the staff", async () => {
		const { parent, created, added } = fakeParent({}, 0n);
		const thread = await createTicketThread(
			parent as never,
			"ticket-" + "x".repeat(120),
			"7",
			["8", "9"]
		);
		expect(thread.id).toBe("800000000000000000");
		const options = created[0] as {
			name: string;
			type: ChannelType;
			invitable: boolean;
		};
		expect(options.type).toBe(ChannelType.PrivateThread);
		expect(options.invitable).toBe(false);
		expect(options.name).toHaveLength(100);
		expect(added[0]).toBe("7"); // the author first, the staff in the background
		await new Promise((r) => setTimeout(r, 0));
		expect(added).toEqual(["7", "8", "9"]);
	});

	test("staff = manages threads there, or holds a staff role", () => {
		const members = new Map([
			["1", { roles: { cache: new Set(["11"]) }, p: 0n }],
			[
				"2",
				{
					roles: { cache: new Set() },
					p: PermissionFlagsBits.ManageThreads
				}
			],
			["3", { roles: { cache: new Set() }, p: 0n }]
		]);
		const thread = {
			guild: { members: { cache: members } },
			permissionsFor: (m: { p: bigint }) => perms(m.p)
		};
		expect(isThreadStaff(thread as never, "1", ["11"])).toBe(true);
		expect(isThreadStaff(thread as never, "2", [])).toBe(true);
		expect(isThreadStaff(thread as never, "3", ["11"])).toBe(false);
		expect(isThreadStaff(thread as never, "404", ["11"])).toBe(false);
	});
});

describe("ticket threads: lifecycle", () => {
	const fakeThread = (archived: boolean) => {
		const calls: unknown[] = [];
		return {
			calls,
			thread: {
				archived,
				setArchived: async (v: boolean) =>
					void calls.push(["archived", v]),
				edit: async (v: unknown) => void calls.push(["edit", v]),
				members: {
					fetch: async () => ({}),
					remove: async (id: string) =>
						void calls.push(["remove", id])
				} as Record<string, unknown>
			}
		};
	};

	test("close locks first, archives last; reopen undoes both", async () => {
		const { thread, calls } = fakeThread(false);
		await lockThread(thread as never);
		await archiveThread(thread as never);
		await reopenThread(thread as never);
		expect(calls).toEqual([
			["edit", { locked: true, archived: false }],
			["archived", true],
			["edit", { archived: false, locked: false }]
		]);
	});

	test("removing someone who already left the thread is not an error", async () => {
		const { thread, calls } = fakeThread(false);
		(thread.members as Record<string, unknown>).fetch = async () => {
			throw new Error("Unknown Member");
		};
		await removeThreadMember(thread as never, "7");
		expect(calls).toEqual([]);
	});

	test("an archived thread is woken up before a member is removed", async () => {
		const { thread, calls } = fakeThread(true);
		await removeThreadMember(thread as never, "7");
		expect(calls).toEqual([
			["archived", false],
			["remove", "7"]
		]);
	});

	test("a thread ticket is fetched when not cached, a channel ticket is not", async () => {
		let fetches = 0;
		const guild = {
			channels: {
				cache: new Map(),
				fetch: async (id: string) => {
					fetches++;
					return { id, type: ChannelType.PrivateThread };
				}
			}
		};
		expect(await fetchTicketChannel(guild as never, "1", false)).toBeNull();
		expect(fetches).toBe(0);
		expect((await fetchTicketChannel(guild as never, "1", true))?.id).toBe(
			"1"
		);
		expect(fetches).toBe(1);
	});
});

describe("ticket threads: panel warnings", () => {
	// Members: id → [bot, raw permissions on the parent].
	const parentWith = (
		members: Record<string, [boolean, bigint]>,
		roleMembers: string[]
	) => {
		const cache = new Collection(
			Object.entries(members).map(([id, [bot]]) => [
				id,
				{ id, user: { bot } }
			])
		);
		const guild = {
			id: "warn-" + Object.keys(members).join(""),
			memberCount: cache.size,
			members: { me: { id: BOT }, cache, fetch: async () => {} },
			roles: {
				cache: Object.assign(
					new Map([
						[
							"31",
							{
								id: "31",
								managed: false,
								members: new Map(
									roleMembers.map((id) => [id, cache.get(id)])
								)
							}
						]
					]),
					{
						filter: () => ({ map: () => [] })
					}
				)
			}
		};
		return {
			guild,
			permissionsFor: (who: { id: string }) =>
				perms(members[who.id]?.[1] ?? 0n)
		};
	};

	test("nobody manages threads, nobody to add", async () => {
		const parent = parentWith({ "1": [false, 0n] }, []);
		expect(await threadStaffCheck(parent as never, ["31"])).toMatchObject({
			staff: 0,
			managers: 0
		});
	});

	test("an administrator counts as a manager", async () => {
		const parent = parentWith(
			{ "1": [false, PermissionFlagsBits.Administrator] },
			[]
		);
		expect((await threadStaffCheck(parent as never, [])).managers).toBe(1);
	});

	test("managers and staff counted, bots left out", async () => {
		const parent = parentWith(
			{
				"1": [false, PermissionFlagsBits.ManageThreads],
				"2": [true, PermissionFlagsBits.ManageThreads],
				"3": [false, 0n]
			},
			["3", "2"]
		);
		expect(await threadStaffCheck(parent as never, ["31"])).toMatchObject({
			staff: 1,
			managers: 1
		});
	});
});

const LANG = new Proxy(
	{},
	{
		get: (_, k) =>
			`${String(k)}:\${channel}\${count}\${author}\${messages}\${last}\${members}`
	}
) as never;

describe("ticket threads: hub of the threads' channel", () => {
	const hubParent = (existing: Set<string>) => {
		const db = new Map<string, unknown>();
		let sent = 0;
		const parent = {
			id: "40",
			guildId: GUILD,
			client: {
				iHorizon_Emojis: {},
				db: {
					get: async (k: string) => db.get(k) ?? null,
					set: async (k: string, v: unknown) => void db.set(k, v)
				}
			},
			messages: {
				fetch: async (id: string) => {
					if (!existing.has(id)) throw new Error("Unknown Message");
					return { id };
				}
			},
			send: async () => {
				const id = `m${++sent}`;
				existing.add(id);
				return { id };
			}
		};
		return { parent, db, sent: () => sent };
	};

	test("posted once, even when asked twice at the same time", async () => {
		const h = hubParent(new Set());
		await Promise.all([
			ensureThreadHub(h.parent as never, LANG),
			ensureThreadHub(h.parent as never, LANG)
		]);
		await ensureThreadHub(h.parent as never, LANG);
		expect(h.sent()).toBe(1);
		expect(h.db.get(`${GUILD}.GUILD.TICKET_THREAD_HUB.40`)).toBe("m1");
	});

	test("posted again once deleted", async () => {
		const existing = new Set<string>();
		const h = hubParent(existing);
		await ensureThreadHub(h.parent as never, LANG);
		existing.clear();
		await ensureThreadHub(h.parent as never, LANG);
		expect(h.sent()).toBe(2);
	});
});

describe("ticket threads: summary", () => {
	// Threads of channel 40 except T9 (another channel); the viewer is in T1 and T3 only.
	const thread = (
		id: string,
		parentId: string,
		locked: boolean,
		last: number,
		members: string[]
	) => ({
		id,
		parentId,
		locked,
		messageCount: 3,
		lastMessageId: String((BigInt(last) - 1420070400000n) << 22n),
		createdTimestamp: 0,
		isThread: () => true,
		type: ChannelType.PrivateThread,
		toString: () => `<#${id}>`,
		permissionsFor: () => perms(0n),
		members: {
			fetch: async (opts?: { member: string }) => {
				if (opts) {
					if (!members.includes(opts.member))
						throw new Error("Unknown Member");
					return { id: opts.member };
				}
				return new Map(members.map((m) => [m, { id: m }]));
			}
		}
	});
	const threads = new Map<string, unknown>([
		["T1", thread("T1", "40", true, 1_800_000_000_000, ["V", "A1", BOT])],
		["T2", thread("T2", "40", false, 1_800_000_000_000, ["A2"])],
		["T3", thread("T3", "40", false, 1_700_000_000_000, ["V", "A3", "S"])],
		["T9", thread("T9", "41", false, 1_800_000_000_000, ["V"])]
	]);
	const all = Object.fromEntries(
		[...threads.keys()].map((id, i) => [
			`A${i + 1}`,
			{
				[id]: {
					channel: id,
					author: `A${i + 1}`,
					alive: true,
					type: "thread"
				}
			}
		])
	);
	const guild = {
		id: GUILD,
		client: { user: { id: BOT }, db: { get: async () => all } },
		channels: { cache: threads, fetch: async () => null }
	};

	test("only what the member can see in this channel, open first", async () => {
		const out = await threadTicketSummary(
			{ id: "V" } as never,
			{ id: "40", guild, toString: () => "<#40>" } as never,
			LANG
		);
		const text = JSON.stringify(out.components);
		expect(text).toContain("ticket_thread_summary_title:<#40>2");
		expect(text).not.toContain("<#T2>");
		expect(text).not.toContain("<#T9>");
		// T3 (open) before T1 (closed), whatever their last message.
		expect(text.indexOf("<#T3>")).toBeLessThan(text.indexOf("<#T1>"));
		// Members shown: neither the bot nor the author.
		expect(text).toContain("<@S>");
		expect(text).not.toContain(`<@${BOT}>`);
		expect(SUMMARY_MAX).toBeGreaterThan(0);
	});
});
