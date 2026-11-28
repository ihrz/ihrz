import { describe, expect, test } from "bun:test";
import { ChannelFlags, ChannelType } from "discord.js";

import { getLogChannel } from "../../src/core/functions/logChannel.ts";

type Guild = Parameters<typeof getLogChannel>[0];

interface FakeThread {
	id: string;
	parentId: string;
	archived: boolean;
	name: string;
	setArchived: (v: boolean) => Promise<FakeThread>;
	isTextBased: () => boolean;
}

function setup(opts: { requireTag?: boolean } = {}) {
	const db = new Map<string, unknown>([
		["g.GUILD.SERVER_LOGS.moderation", "forum"],
		["g.GUILD.SERVER_LOGS.voice", "text"]
	]);
	const created: { name: string; content: string; tags?: string[] }[] = [];
	const threads = new Map<string, FakeThread>();
	const thread = (id: string, name: string): FakeThread => {
		const t: FakeThread = {
			id,
			parentId: "forum",
			archived: false,
			name,
			setArchived: async (v) => {
				t.archived = v;
				return t;
			},
			isTextBased: () => true
		};
		threads.set(id, t);
		return t;
	};
	const client = {
		db: {
			get: async (k: string) => db.get(k) ?? null,
			set: async (k: string, v: unknown) => {
				db.set(k, v);
			}
		},
		func: {
			getLanguageData: async () => ({
				setlogschannel_var_mods: "Moderation Logs",
				logs_forum_post_intro:
					"This post receives the server's **${logType}**."
			})
		}
	};
	const forum = {
		id: "forum",
		type: ChannelType.GuildForum,
		flags: {
			has: (f: number) =>
				!!opts.requireTag && f === ChannelFlags.RequireTag
		},
		availableTags: [{ id: "tag1" }],
		threads: {
			cache: threads,
			fetch: async (id: string) => threads.get(id) ?? null,
			create: async (o: {
				name: string;
				message: { content: string };
				appliedTags?: string[];
			}) => {
				await new Promise((r) => setTimeout(r, 5));
				created.push({
					name: o.name,
					content: o.message.content,
					tags: o.appliedTags
				});
				return thread(`t${created.length}`, o.name);
			}
		},
		isTextBased: () => false
	};
	const text = {
		id: "text",
		type: ChannelType.GuildText,
		isTextBased: () => true
	};
	const guild = {
		id: "g",
		client,
		channels: {
			cache: new Map<string, unknown>([
				["forum", forum],
				["text", text]
			]),
			fetch: async () => null
		}
	};
	(forum as { guild?: unknown }).guild = guild;
	return { guild: guild as unknown as Guild, db, created, threads, text };
}

describe("getLogChannel", () => {
	test("a text channel is used as it is", async () => {
		const { guild, text } = setup();
		expect(await getLogChannel(guild, "voice")).toBe(text as never);
	});

	test("nothing set: no channel", async () => {
		const { guild } = setup();
		expect(await getLogChannel(guild, "roles")).toBeNull();
	});

	test("a forum gets one post per type, named in the server's language, remembered", async () => {
		const { guild, db, created } = setup();
		const first = await getLogChannel(guild, "moderation");
		expect(created).toEqual([
			{
				name: "Moderation Logs",
				content: "This post receives the server's **Moderation Logs**.",
				tags: undefined
			}
		]);
		expect(db.get("g.GUILD.LOG_POSTS.forum.moderation")).toBe("t1");
		const again = await getLogChannel(guild, "moderation");
		expect(again).toBe(first);
		expect(created).toHaveLength(1);
	});

	test("two logs at once open one post", async () => {
		const { guild, created } = setup();
		const [a, b] = await Promise.all([
			getLogChannel(guild, "moderation"),
			getLogChannel(guild, "moderation")
		]);
		expect(a).toBe(b);
		expect(created).toHaveLength(1);
	});

	test("an archived post is reopened", async () => {
		const { guild, threads } = setup();
		const post = (await getLogChannel(
			guild,
			"moderation"
		)) as unknown as FakeThread;
		post.archived = true;
		const again = (await getLogChannel(
			guild,
			"moderation"
		)) as unknown as FakeThread;
		expect(again).toBe(post);
		expect(threads.get(post.id)?.archived).toBe(false);
	});

	test("a forum that requires a tag gets its first one", async () => {
		const { guild, created } = setup({ requireTag: true });
		await getLogChannel(guild, "moderation");
		expect(created[0].tags).toEqual(["tag1"]);
	});
});
