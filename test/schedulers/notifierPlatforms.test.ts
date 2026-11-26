import { afterEach, describe, expect, test } from "bun:test";

// StreamNotifier imports the real logger, which replaces the preload stand-in: put it back afterwards.
const previousLogger = globalThis.logger;
const { StreamNotifier, profileUrl, isDomain, isPublicIp, isPublicHost } =
	await import("../../src/core/StreamNotifier.ts");
globalThis.logger = previousLogger;

const realFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = realFetch;
});

/** Answers by URL substring; records every URL asked. */
function fakeFetch(routes: Record<string, unknown>): string[] {
	const asked: string[] = [];
	globalThis.fetch = (async (input: string | URL | Request) => {
		const url = String(input);
		asked.push(url);
		const hit = Object.entries(routes).find(([k]) => url.includes(k));
		return hit
			? new Response(JSON.stringify(hit[1]), { status: 200 })
			: new Response("{}", { status: 404 });
	}) as typeof fetch;
	return asked;
}

describe("notifier platforms", () => {
	test("profile links by platform", () => {
		expect(profileUrl("youtube", "UCx")).toBe(
			"https://youtube.com/channel/UCx"
		);
		expect(profileUrl("kick", "xqc")).toBe("https://kick.com/xqc");
		expect(profileUrl("bluesky", "did:plc:a")).toBe(
			"https://bsky.app/profile/did:plc:a"
		);
		expect(profileUrl("mastodon", "Gargron@mastodon.social")).toBe(
			"https://mastodon.social/@Gargron"
		);
	});

	test("a Mastodon instance must be a public domain", async () => {
		expect(isDomain("mastodon.social")).toBe(true);
		for (const h of [
			"localhost",
			"10.0.0.1",
			"printer.local",
			"db.internal",
			"nodot"
		])
			expect(isDomain(h)).toBe(false);
		for (const ip of [
			"127.0.0.1",
			"10.2.3.4",
			"172.20.0.1",
			"192.168.1.193",
			"169.254.169.254",
			"100.64.0.1",
			"::1",
			"fd00::1",
			"fe80::1",
			"::ffff:10.0.0.1"
		])
			expect(isPublicIp(ip)).toBe(false);
		for (const ip of ["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"])
			expect(isPublicIp(ip)).toBe(true);
		expect(await isPublicHost("localhost")).toBe(false);
	});

	test("a Bluesky @handle is stored as its DID", async () => {
		fakeFetch({
			"app.bsky.actor.getProfile": {
				did: "did:plc:jay",
				handle: "jay.bsky.team",
				displayName: "Jay"
			}
		});
		const n = new StreamNotifier("", "", "");
		expect(await n.resolveAuthor("bluesky", "@jay.bsky.team")).toEqual({
			id: "did:plc:jay",
			name: "Jay"
		});
		expect(
			await n.resolveAuthor(
				"bluesky",
				"https://bsky.app/profile/jay.bsky.team"
			)
		).toEqual({ id: "did:plc:jay", name: "Jay" });
		expect(await n.resolveAuthor("bluesky", "not a handle")).toBeNull();
	});

	test("a Mastodon account on an internal address is never asked", async () => {
		const asked = fakeFetch({});
		const n = new StreamNotifier("", "", "");
		expect(
			await n.resolveAuthor("mastodon", "@admin@localhost")
		).toBeNull();
		expect(await n.resolveAuthor("mastodon", "@admin@10.0.0.1")).toBeNull();
		expect(asked).toEqual([]);
	});

	test("Kick needs its app keys", async () => {
		const asked = fakeFetch({});
		expect(
			await new StreamNotifier("", "", "").resolveAuthor("kick", "xqc")
		).toBeNull();
		expect(asked).toEqual([]);
	});

	test("a removed Bluesky account is found from its @handle", async () => {
		fakeFetch({
			"app.bsky.actor.getProfile": {
				did: "did:plc:jay",
				handle: "jay.bsky.team"
			}
		});
		const n = new StreamNotifier("", "", "");
		const users = [
			{ id_or_username: "UCx", platform: "youtube" as const },
			{ id_or_username: "did:plc:jay", platform: "bluesky" as const }
		];
		expect(await n.findFollowed(users, "bluesky", "@jay.bsky.team")).toBe(
			1
		);
		expect(await n.findFollowed(users, "youtube", "ucx")).toBe(0);
	});

	test("the latest Bluesky post skips reposts and pinned posts", async () => {
		const post = (rkey: string, at: string, did = "did:plc:jay") => ({
			post: {
				uri: `at://${did}/app.bsky.feed.post/${rkey}`,
				author: { did, handle: "jay.bsky.team" },
				record: { text: rkey, createdAt: at }
			}
		});
		fakeFetch({
			getAuthorFeed: {
				feed: [
					{
						...post("pinned", "2026-11-26T10:00:00Z"),
						reason: { $type: "app.bsky.feed.defs#reasonPin" }
					},
					{
						...post(
							"repost",
							"2026-11-26T09:00:00Z",
							"did:plc:other"
						),
						reason: { $type: "app.bsky.feed.defs#reasonRepost" }
					},
					post("new", "2026-11-25T12:00:00Z"),
					post("old", "2026-11-20T12:00:00Z")
				]
			}
		});
		const n = new StreamNotifier("", "", "") as unknown as {
			latestBlueskyPost(
				did: string
			): Promise<{ id: string; link: string } | null>;
		};
		const latest = await n.latestBlueskyPost("did:plc:jay");
		expect(latest?.id).toBe("at://did:plc:jay/app.bsky.feed.post/new");
		expect(latest?.link).toBe(
			"https://bsky.app/profile/jay.bsky.team/post/new"
		);
	});
});
