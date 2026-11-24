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

// Google Forms responses (src/core/modules/googleForms.ts): member lookup,
// the card, the role guards and the ack of `guild.form.submitted`.
import { beforeEach, describe, expect, test } from "bun:test";
import {
	ChannelType,
	Collection,
	MessageFlags,
	PermissionFlagsBits,
	PermissionsBitField
} from "discord.js";

import enUS from "../../src/lang/en-US.ts";
import { Memory } from "../../src/core/database/driver/memory.ts";
import {
	googleFormsTable,
	initTables,
	resetTables
} from "../../src/core/database/tables.ts";
import {
	CARD_MAX_ANSWERS,
	deleteGuildForms,
	formCard,
	handleFormSubmitted,
	resolveMember,
	roleRefusal
} from "../../src/core/modules/googleForms.ts";
import { cardPayload } from "../../src/core/modules/uiCard.ts";

const GUILD = "100000000000000000";
const BOT = "900000000000000000";
const USER = "400000000000000000";
const OTHER = "410000000000000000";
const CHAN = "500000000000000000";
const ROLE = "600000000000000000";
const lang = enUS as never;

function fakeMember(
	id: string,
	username: string,
	opts: { globalName?: string | null; position?: number; perms?: bigint } = {}
) {
	const roles = new Set<string>();
	const added: string[] = [];
	return {
		id,
		added,
		user: { id, username, globalName: opts.globalName ?? null, bot: false },
		toString: () => `<@${id}>`,
		roles: {
			highest: { position: opts.position ?? 1 },
			cache: { has: (r: string) => roles.has(r) },
			add: async (role: { id: string }) => {
				roles.add(role.id);
				added.push(role.id);
			}
		},
		permissions: new PermissionsBitField(opts.perms ?? 0n),
		permissionsIn: () => new PermissionsBitField(opts.perms ?? 0n)
	} as any;
}

function fakeRole(id: string, position: number, managed = false) {
	return { id, position, managed } as any;
}

function fakeGuild(
	opts: {
		members?: any[];
		roles?: any[];
		botPosition?: number;
		botPerms?: bigint;
		cachedMembers?: any[];
	} = {}
) {
	const members = opts.members ?? [];
	const cache = new Collection<string, any>(
		(opts.cachedMembers ?? []).map((m) => [m.id, m])
	);
	const sent: any[] = [];
	const searches: string[] = [];
	const channel = {
		id: CHAN,
		type: ChannelType.GuildText,
		send: async (payload: any) => {
			sent.push(payload);
			return {};
		}
	};
	const me = fakeMember(BOT, "ihorizon", {
		position: opts.botPosition ?? 10,
		perms:
			opts.botPerms ??
			PermissionFlagsBits.ManageRoles |
				PermissionFlagsBits.ViewChannel |
				PermissionFlagsBits.SendMessages
	});
	return {
		id: GUILD,
		sent,
		searches,
		channels: { cache: new Collection([[CHAN, channel]]) },
		roles: {
			cache: new Collection<string, any>(
				(opts.roles ?? []).map((r) => [r.id, r])
			)
		},
		members: {
			me,
			cache,
			fetch: async (id: string) => {
				const m = members.find((x) => x.id === id);
				if (!m) throw new Error("Unknown Member");
				return m;
			},
			search: async ({ query }: { query: string }) => {
				searches.push(query);
				return new Collection(
					members
						.filter(
							(m) =>
								m.user.username
									.toLowerCase()
									.startsWith(query) ||
								(m.user.globalName ?? "")
									.toLowerCase()
									.startsWith(query)
						)
						.map((m) => [m.id, m])
				);
			}
		}
	} as any;
}

function link(overrides: Record<string, unknown> = {}) {
	return {
		id: "abcd1234",
		name: "Applications",
		enabled: true,
		channelId: CHAN,
		roleId: ROLE,
		memberQuestion: "Discord username",
		createdBy: USER,
		createdAt: 1,
		updatedAt: 1,
		...overrides
	};
}

function fakeClient(guild: any, config: unknown) {
	const db: Record<string, unknown> = {
		[`${GUILD}.GUILD.GOOGLE_FORMS`]: config
	};
	return {
		db: {
			get: async (k: string) => db[k] ?? null,
			delete: async (k: string) => {
				delete db[k];
			}
		},
		guilds: { cache: new Collection([[GUILD, guild]]) },
		func: {
			getLanguageData: async () => enUS,
			displayBotName: {
				footerBuilder: async () => ({ text: "iHorizon" })
			}
		},
		iHorizon_Emojis: {}
	} as any;
}

function event(overrides: Record<string, unknown> = {}) {
	return {
		op: "event",
		id: "e1",
		type: "guild.form.submitted",
		guildId: GUILD,
		linkId: "abcd1234",
		name: "Applications",
		formTitle: "Staff application",
		submittedAt: 1_760_000_000_000,
		answers: [
			{ question: "Discord username", answer: "Alice" },
			{ question: "Why?", answer: ["Fun", "Help"] }
		],
		memberQuery: "Alice",
		...overrides
	} as any;
}

// Every text display of a card, joined.
function cardText(card: any): string {
	const out: string[] = [];
	const walk = (node: any) => {
		if (!node || typeof node !== "object") return;
		if (node.type === 10 && typeof node.content === "string")
			out.push(node.content);
		for (const v of Object.values(node)) {
			if (Array.isArray(v)) v.forEach(walk);
			else if (v && typeof v === "object") walk(v);
		}
	};
	walk(card.toJSON());
	return out.join("\n");
}

describe("resolveMember", () => {
	const alice = fakeMember(USER, "alice", { globalName: "Alice W" });
	const alicia = fakeMember(OTHER, "alicia");
	const guild = () => fakeGuild({ members: [alice, alicia] });

	test("a user id (or a mention) is fetched", async () => {
		expect(await resolveMember(guild(), USER)).toBe(alice);
		expect(await resolveMember(guild(), ` <@${USER}> `)).toBe(alice);
		expect(await resolveMember(guild(), "123456789012345678")).toBeNull();
	});

	test("a username matches exactly, case-insensitive", async () => {
		const g = guild();
		expect(await resolveMember(g, "ALICE")).toBe(alice);
		expect(await resolveMember(g, "@alicia")).toBe(alicia);
		expect(await resolveMember(g, "alice w")).toBe(alice);
		expect(g.searches).toContain("alice");
	});

	test("a prefix is not a match; nothing found ⇒ null", async () => {
		expect(await resolveMember(guild(), "ali")).toBeNull();
		expect(await resolveMember(guild(), "bob")).toBeNull();
		expect(await resolveMember(guild(), "")).toBeNull();
		expect(await resolveMember(guild(), null)).toBeNull();
		expect(await resolveMember(guild(), "x".repeat(40))).toBeNull();
	});

	test("the cache is tried before the search", async () => {
		const g = fakeGuild({ members: [], cachedMembers: [alice] });
		expect(await resolveMember(g, "alice")).toBe(alice);
		expect(g.searches).toEqual([]);
	});
});

describe("formCard", () => {
	const base = {
		name: "Applications",
		formTitle: "Staff application",
		submittedAt: 1_760_000_000_000,
		member: null,
		memberQuery: null,
		test: false,
		lang
	};

	test("a Components V2 card that never pings", () => {
		const card = formCard({
			...base,
			answers: [{ question: "Hi", answer: "@everyone <@&1>" }]
		});
		const payload = cardPayload(card);
		expect(payload.flags).toContain(MessageFlags.IsComponentsV2);
		expect(payload.allowedMentions).toEqual({ parse: [] });
		const text = cardText(card);
		expect(text).toContain("## Applications");
		expect(text).toContain("New response to **Staff application**");
		expect(text).toContain("<t:1760000000:f>");
		expect(text).not.toContain("Test response");
	});

	test("long answers are clipped and arrays joined", () => {
		const text = cardText(
			formCard({
				...base,
				answers: [
					{ question: "Long", answer: "a".repeat(5000) },
					{ question: "Many", answer: ["x", "y"] },
					{ question: "Empty", answer: "" }
				]
			})
		);
		expect(text).toContain(`> ${"a".repeat(299)}…`);
		expect(text).not.toContain("a".repeat(301));
		expect(text).toContain("> x, y");
		expect(text).toContain("No answer");
		expect(text.length).toBeLessThan(4000);
	});

	test("beyond the cap: +N more", () => {
		const answers = Array.from(
			{ length: CARD_MAX_ANSWERS + 5 },
			(_, i) => ({
				question: `Q${i}`,
				answer: "ok"
			})
		);
		const text = cardText(formCard({ ...base, answers }));
		expect(text).toContain("+5 more answers");
		expect(text).toContain(`**Q${CARD_MAX_ANSWERS - 1}**`);
		expect(text).not.toContain(`**Q${CARD_MAX_ANSWERS}**`);
	});

	test("the whole card stays under Discord's 4000 characters", () => {
		const answers = Array.from({ length: 20 }, (_, i) => ({
			question: `Q${i} ${"q".repeat(300)}`,
			answer: "z".repeat(2000)
		}));
		const text = cardText(formCard({ ...base, answers }));
		expect(text.length).toBeLessThan(4000);
		expect(text).toMatch(/\+\d+ more answers/);
	});

	test("test responses are marked; member shown or 'not found'", () => {
		const alice = fakeMember(USER, "alice");
		const found = cardText(
			formCard({
				...base,
				answers: [],
				member: alice,
				memberQuery: "alice",
				test: true
			})
		);
		expect(found).toContain("Test response");
		expect(found).toContain(`<@${USER}>`);
		const missing = cardText(
			formCard({ ...base, answers: [], memberQuery: "bob" })
		);
		expect(missing).toContain("bob (not found on the server)");
	});
});

describe("roleRefusal", () => {
	const alice = fakeMember(USER, "alice");
	test("given only below the bot, unmanaged, member found", () => {
		const g = fakeGuild({ botPosition: 10 });
		expect(roleRefusal(g, fakeRole(ROLE, 5), alice)).toBeNull();
		expect(roleRefusal(g, fakeRole(ROLE, 5, true), alice)).toBe(
			"role is managed"
		);
		expect(roleRefusal(g, fakeRole(GUILD, 0), alice)).toBe(
			"role is managed"
		);
		expect(roleRefusal(g, fakeRole(ROLE, 10), alice)).toBe(
			"role is above the bot's highest role"
		);
		expect(roleRefusal(g, fakeRole(ROLE, 5), null)).toBe(
			"member not found"
		);
		expect(roleRefusal(g, undefined, alice)).toBe("role not found");
		const noPerm = fakeGuild({
			botPerms: PermissionFlagsBits.SendMessages
		});
		expect(roleRefusal(noPerm, fakeRole(ROLE, 5), alice)).toBe(
			"missing Manage Roles permission"
		);
	});
});

describe("handleFormSubmitted", () => {
	test("posts the card and gives the role: ack shape", async () => {
		const alice = fakeMember(USER, "alice");
		const g = fakeGuild({ members: [alice], roles: [fakeRole(ROLE, 5)] });
		const ack = await handleFormSubmitted(
			fakeClient(g, { links: [link()] }),
			event()
		);
		expect(ack).toEqual({ posted: true, roleGiven: true, memberId: USER });
		expect(g.sent).toHaveLength(1);
		expect(g.sent[0].allowedMentions).toEqual({ parse: [] });
		expect(alice.added).toEqual([ROLE]);
	});

	test("missing or disabled link ⇒ nothing", async () => {
		for (const config of [
			null,
			{ links: [] },
			{ links: [link({ enabled: false })] },
			{ links: [link({ id: "zzzz9999" })] }
		]) {
			const alice = fakeMember(USER, "alice");
			const g = fakeGuild({
				members: [alice],
				roles: [fakeRole(ROLE, 5)]
			});
			const ack = await handleFormSubmitted(
				fakeClient(g, config),
				event()
			);
			expect(ack).toEqual({
				posted: false,
				roleGiven: false,
				memberId: null
			});
			expect(g.sent).toHaveLength(0);
			expect(alice.added).toEqual([]);
		}
	});

	test("role above the bot or managed, member not found ⇒ not given", async () => {
		for (const role of [fakeRole(ROLE, 50), fakeRole(ROLE, 5, true)]) {
			const alice = fakeMember(USER, "alice");
			const g = fakeGuild({ members: [alice], roles: [role] });
			const ack = await handleFormSubmitted(
				fakeClient(g, { links: [link()] }),
				event()
			);
			expect(ack).toEqual({
				posted: true,
				roleGiven: false,
				memberId: USER
			});
			expect(alice.added).toEqual([]);
		}
		const g = fakeGuild({ members: [], roles: [fakeRole(ROLE, 5)] });
		const ack = await handleFormSubmitted(
			fakeClient(g, { links: [link()] }),
			event()
		);
		expect(ack).toEqual({ posted: true, roleGiven: false, memberId: null });
	});

	test("a test response is marked and gives no role", async () => {
		const alice = fakeMember(USER, "alice");
		const g = fakeGuild({ members: [alice], roles: [fakeRole(ROLE, 5)] });
		const ack = await handleFormSubmitted(
			fakeClient(g, { links: [link()] }),
			event({ test: true })
		);
		expect(ack).toEqual({ posted: true, roleGiven: false, memberId: USER });
		expect(alice.added).toEqual([]);
		expect(JSON.stringify(g.sent[0].components)).toContain("Test response");
	});

	test("no channel or a channel the bot cannot post in ⇒ not posted", async () => {
		const alice = fakeMember(USER, "alice");
		const g = fakeGuild({ members: [alice], roles: [fakeRole(ROLE, 5)] });
		const ack = await handleFormSubmitted(
			fakeClient(g, { links: [link({ channelId: null })] }),
			event()
		);
		expect(ack).toEqual({ posted: false, roleGiven: true, memberId: USER });

		const mute = fakeGuild({
			members: [fakeMember(USER, "alice")],
			roles: [fakeRole(ROLE, 5)],
			botPerms: PermissionFlagsBits.ManageRoles
		});
		const ack2 = await handleFormSubmitted(
			fakeClient(mute, { links: [link()] }),
			event()
		);
		expect(ack2.posted).toBe(false);
		expect(mute.sent).toHaveLength(0);
	});

	test("no member question ⇒ nobody is looked up", async () => {
		const alice = fakeMember(USER, "alice");
		const g = fakeGuild({ members: [alice], roles: [fakeRole(ROLE, 5)] });
		const ack = await handleFormSubmitted(
			fakeClient(g, { links: [link({ memberQuestion: null })] }),
			event()
		);
		expect(ack).toEqual({ posted: true, roleGiven: false, memberId: null });
	});

	test("unknown guild ⇒ refused (the gateway records an error)", async () => {
		const client = fakeClient(fakeGuild(), { links: [link()] });
		client.guilds.cache = new Collection();
		await expect(handleFormSubmitted(client, event())).rejects.toBe(
			"guild not found"
		);
	});
});

describe("deleteGuildForms", () => {
	beforeEach(async () => {
		resetTables();
		await initTables({ db: new Memory() } as never, ["googleFormsTable"]);
	});

	test("erases the stats and the response pages of every link", async () => {
		const s = `S_${GUILD}_abcd1234`;
		const p1 = `R_${GUILD}_abcd1234_1`;
		const p2 = `R_${GUILD}_abcd1234_2`;
		const foreign = `R_${OTHER}_abcd1234_1`;
		await googleFormsTable.set(s, { pages: [p2, p1, foreign] });
		await googleFormsTable.set(p1, []);
		await googleFormsTable.set(p2, []);
		await googleFormsTable.set(foreign, []);
		const kept = `S_${OTHER}_abcd1234`;
		await googleFormsTable.set(kept, { pages: [] });

		await deleteGuildForms(
			fakeClient(fakeGuild(), { links: [link()] }),
			GUILD
		);
		expect(await googleFormsTable.get(s)).toBeNull();
		expect(await googleFormsTable.get(p1)).toBeNull();
		expect(await googleFormsTable.get(p2)).toBeNull();
		// Another guild's page named in the stats is not touched.
		expect(await googleFormsTable.get(foreign)).toEqual([]);
		expect(await googleFormsTable.get(kept)).toEqual({ pages: [] });
	});

	test("no config ⇒ nothing to do", async () => {
		await deleteGuildForms(fakeClient(fakeGuild(), null), GUILD);
	});
});
