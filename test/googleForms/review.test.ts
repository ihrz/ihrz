import { beforeEach, describe, expect, test } from "bun:test";
import {
	ChannelType,
	type Client,
	Collection,
	type Guild,
	type GuildMember,
	PermissionFlagsBits,
	PermissionsBitField,
	type Role
} from "discord.js";

import enUS from "../../src/lang/en-US.ts";
import { Memory } from "../../src/core/database/driver/memory.ts";
import {
	googleFormsTable,
	initTables,
	resetTables
} from "../../src/core/database/tables.ts";
import {
	decideReview,
	deleteGuildForms,
	handleFormReview,
	handleFormSubmitted,
	isReviewer,
	reviewsKey,
	trimReviews
} from "../../src/core/modules/googleForms.ts";

const GUILD = "100000000000000000";
const BOT = "900000000000000000";
const OWNER = "800000000000000000";
const APPLICANT = "400000000000000000";
const STAFF = "410000000000000000";
const NOBODY = "420000000000000000";
const CHAN = "500000000000000000";
const ROLE = "600000000000000000";
const REFUSED = "610000000000000000";
const REVIEWERS = "620000000000000000";
const LINK = "abcd1234";

function fakeMember(
	id: string,
	username: string,
	opts: { roles?: string[]; perms?: bigint; position?: number } = {}
) {
	const roles = new Set<string>(opts.roles ?? []);
	const added: string[] = [];
	const dms: unknown[] = [];
	return {
		id,
		added,
		dms,
		guild: { ownerId: OWNER },
		user: { id, username, globalName: null, bot: false },
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
		permissionsIn: () => new PermissionsBitField(opts.perms ?? 0n),
		send: async (payload: unknown) => {
			dms.push(payload);
			return {};
		}
	} as unknown as GuildMember & { added: string[]; dms: unknown[] };
}

const role = (id: string, position: number) =>
	({ id, position, managed: false }) as unknown as Role;

function fakeGuild(members: GuildMember[]) {
	const sent: { components: unknown[] }[] = [];
	const edits: { components: unknown[] }[] = [];
	const message = {
		id: "700000000000000000",
		components: [{ toJSON: () => ({ type: 17, components: [] }) }],
		edit: async (payload: { components: unknown[] }) => {
			edits.push(payload);
			return message;
		}
	};
	const channel = {
		id: CHAN,
		type: ChannelType.GuildText,
		isTextBased: () => true,
		send: async (payload: { components: unknown[] }) => {
			sent.push(payload);
			return message;
		},
		messages: { fetch: async () => message }
	};
	const me = fakeMember(BOT, "ihorizon", {
		position: 10,
		perms:
			PermissionFlagsBits.ManageRoles |
			PermissionFlagsBits.ViewChannel |
			PermissionFlagsBits.SendMessages
	});
	return {
		id: GUILD,
		name: "Server",
		ownerId: OWNER,
		sent,
		edits,
		channels: { cache: new Collection([[CHAN, channel]]) },
		roles: {
			cache: new Collection<string, Role>(
				[ROLE, REFUSED, REVIEWERS].map((r) => [r, role(r, 5)])
			)
		},
		members: {
			me,
			cache: new Collection<string, GuildMember>(),
			fetch: async (id: string) => {
				const m = members.find((x) => x.id === id);
				if (!m) throw new Error("Unknown Member");
				return m;
			},
			search: async () => new Collection()
		}
	} as unknown as Guild & {
		sent: { components: unknown[] }[];
		edits: { components: unknown[] }[];
	};
}

const link = (o: Record<string, unknown> = {}) => ({
	id: LINK,
	name: "Staff",
	enabled: true,
	channelId: CHAN,
	roleId: ROLE,
	memberQuestion: "Discord",
	review: true,
	reviewerRoleId: REVIEWERS,
	refusedRoleId: REFUSED,
	createdBy: OWNER,
	createdAt: 1,
	updatedAt: 1,
	...o
});

function fakeClient(guild: Guild, l: ReturnType<typeof link>) {
	return {
		db: {
			get: async (k: string) =>
				k === `${GUILD}.GUILD.GOOGLE_FORMS` ? { links: [l] } : null
		},
		guilds: { cache: new Collection([[GUILD, guild]]) },
		func: {
			getLanguageData: async () => enUS,
			displayBotName: {
				footerBuilder: async () => ({ text: "iHorizon" })
			}
		},
		iHorizon_Emojis: {}
	} as unknown as Client;
}

const submitted = (o: Record<string, unknown> = {}) =>
	({
		op: "event",
		id: "e1",
		type: "guild.form.submitted",
		guildId: GUILD,
		linkId: LINK,
		name: "Staff",
		formTitle: "Staff application",
		submittedAt: 1_760_000_000_000,
		answers: [{ question: "Discord", answer: "alice" }],
		memberQuery: APPLICANT,
		responseId: "resp-1",
		...o
	}) as never;

const customIds = (payload: { components: unknown[] }) =>
	JSON.stringify(payload.components).match(
		/gform-review%[a-z]+%[a-z0-9]+%[a-f0-9]+/g
	) ?? [];

/** The review id of the card's first button (fails the test clearly when the card has none). */
function reviewIdOf(payload: { components: unknown[] }): string {
	const id = customIds(payload)[0]?.split("%")[3];
	if (!id) throw new Error("the card has no review button");
	return id;
}

describe("applications (Google Forms review mode)", () => {
	beforeEach(async () => {
		resetTables();
		await initTables({ db: new Memory() } as never, ["googleFormsTable"]);
	});

	test("a response is pending: buttons on the card, no role yet, the review stored with its response id", async () => {
		const applicant = fakeMember(APPLICANT, "alice");
		const g = fakeGuild([applicant]);
		const ack = await handleFormSubmitted(
			fakeClient(g, link()),
			submitted()
		);
		expect(ack).toEqual({
			posted: true,
			roleGiven: false,
			memberId: APPLICANT
		});
		expect(applicant.added).toEqual([]);
		expect(customIds(g.sent[0]).length).toBe(2);
		const reviews = (await googleFormsTable.get(
			reviewsKey(GUILD, LINK)
		)) as Record<
			string,
			{ status: string; responseId: string; messageId: string }
		>;
		const [entry] = Object.values(reviews);
		expect(entry).toMatchObject({
			status: "pending",
			responseId: "resp-1",
			memberId: APPLICANT,
			messageId: "700000000000000000"
		});
	});

	test("without review mode nothing changes: the role at once, no buttons, nothing stored", async () => {
		const applicant = fakeMember(APPLICANT, "alice");
		const g = fakeGuild([applicant]);
		const ack = await handleFormSubmitted(
			fakeClient(g, link({ review: false })),
			submitted()
		);
		expect(ack.roleGiven).toBe(true);
		expect(customIds(g.sent[0])).toEqual([]);
		expect(await googleFormsTable.get(reviewsKey(GUILD, LINK))).toBeNull();
	});

	test("a test response is never an application", async () => {
		const g = fakeGuild([fakeMember(APPLICANT, "alice")]);
		await handleFormSubmitted(
			fakeClient(g, link()),
			submitted({ test: true })
		);
		expect(customIds(g.sent[0])).toEqual([]);
		expect(await googleFormsTable.get(reviewsKey(GUILD, LINK))).toBeNull();
	});

	test("reviewers: the form's role, administrators, the owner — nobody else", () => {
		const l = link() as never;
		expect(
			isReviewer(fakeMember(STAFF, "staff", { roles: [REVIEWERS] }), l)
		).toBe(true);
		expect(
			isReviewer(
				fakeMember(NOBODY, "admin", {
					perms: PermissionFlagsBits.Administrator
				}),
				l
			)
		).toBe(true);
		expect(isReviewer(fakeMember(OWNER, "owner"), l)).toBe(true);
		expect(isReviewer(fakeMember(NOBODY, "nobody"), l)).toBe(false);
		expect(
			isReviewer(
				fakeMember(STAFF, "staff", { roles: [REVIEWERS] }),
				link({ reviewerRoleId: null }) as never
			)
		).toBe(false);
	});

	test("accept: the role, a DM, the card's buttons replaced; a second decision is refused", async () => {
		const applicant = fakeMember(APPLICANT, "alice");
		const staff = fakeMember(STAFF, "staff", { roles: [REVIEWERS] });
		const g = fakeGuild([applicant, staff]);
		const client = fakeClient(g, link());
		await handleFormSubmitted(client, submitted());
		const reviewId = reviewIdOf(g.sent[0]);

		const ack = await decideReview(client, {
			guild: g,
			link: link() as never,
			reviewId,
			actor: staff,
			decision: "accept"
		});
		expect(ack).toEqual({
			status: "accepted",
			roleGiven: true,
			dmSent: true
		});
		expect(applicant.added).toEqual([ROLE]);
		expect(applicant.dms.length).toBe(1);
		expect(JSON.stringify(g.edits[0].components)).toContain(`<@${STAFF}>`);
		expect(customIds(g.edits[0])).toEqual([]);

		await expect(
			decideReview(client, {
				guild: g,
				link: link() as never,
				reviewId,
				actor: staff,
				decision: "refuse"
			})
		).rejects.toBe("already decided");
	});

	test("refuse: the refused role and the reason; no DM when the form turns it off", async () => {
		const applicant = fakeMember(APPLICANT, "alice");
		const staff = fakeMember(STAFF, "staff", { roles: [REVIEWERS] });
		const g = fakeGuild([applicant, staff]);
		const l = link({ notifyApplicant: false });
		const client = fakeClient(g, l);
		await handleFormSubmitted(client, submitted());
		const reviewId = reviewIdOf(g.sent[0]);
		const ack = await decideReview(client, {
			guild: g,
			link: l as never,
			reviewId,
			actor: staff,
			decision: "refuse",
			reason: "  Too young  "
		});
		expect(ack).toEqual({
			status: "refused",
			roleGiven: true,
			dmSent: false
		});
		expect(applicant.added).toEqual([REFUSED]);
		const reviews = (await googleFormsTable.get(
			reviewsKey(GUILD, LINK)
		)) as Record<string, { reason: string; decidedBy: string }>;
		expect(Object.values(reviews)[0]).toMatchObject({
			reason: "Too young",
			decidedBy: STAFF
		});
		expect(JSON.stringify(g.edits[0].components)).toContain("Too young");
	});

	test("someone who is not a reviewer cannot decide", async () => {
		const g = fakeGuild([fakeMember(APPLICANT, "alice")]);
		const client = fakeClient(g, link());
		await handleFormSubmitted(client, submitted());
		const reviewId = reviewIdOf(g.sent[0]);
		await expect(
			decideReview(client, {
				guild: g,
				link: link() as never,
				reviewId,
				actor: fakeMember(NOBODY, "x"),
				decision: "accept"
			})
		).rejects.toBe("forbidden: not a reviewer of this form");
	});

	test("the dashboard decides by response id, as its actor", async () => {
		const applicant = fakeMember(APPLICANT, "alice");
		const staff = fakeMember(STAFF, "staff", { roles: [REVIEWERS] });
		const g = fakeGuild([applicant, staff]);
		const client = fakeClient(g, link());
		await handleFormSubmitted(client, submitted());
		const review = (o: Record<string, unknown>) =>
			handleFormReview(client, {
				op: "event",
				id: "e2",
				type: "guild.form.review",
				guildId: GUILD,
				linkId: LINK,
				responseId: "resp-1",
				decision: "accept",
				actorId: STAFF,
				...o
			} as never);
		await expect(review({ responseId: "nope" })).rejects.toBe(
			"application not found"
		);
		await expect(review({ actorId: NOBODY })).rejects.toBe(
			"forbidden: not a member of the server"
		);
		expect(await review({})).toEqual({
			status: "accepted",
			roleGiven: true,
			dmSent: true
		});
	});

	test("500 applications at most: decided ones go first", () => {
		const reviews: Record<string, { status: string; at: number }> = {};
		for (let i = 0; i < 6; i++)
			reviews[`r${i}`] = {
				status: i < 3 ? "accepted" : "pending",
				at: i
			} as never;
		expect(Object.keys(trimReviews(reviews as never, 4)).sort()).toEqual([
			"r2",
			"r3",
			"r4",
			"r5"
		]);
	});

	test("the applications are erased when the bot leaves the server", async () => {
		await googleFormsTable.set(reviewsKey(GUILD, LINK), {
			x: { status: "pending" }
		});
		const client = {
			db: { get: async () => ({ links: [{ id: LINK }] }) }
		} as unknown as Client;
		await deleteGuildForms(client, GUILD);
		expect(await googleFormsTable.get(reviewsKey(GUILD, LINK))).toBeNull();
	});
});
