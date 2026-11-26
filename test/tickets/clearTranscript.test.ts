import { describe, expect, test } from "bun:test";
import { Collection } from "discord.js";

import {
	buildClearTranscript,
	saveClearTranscript
} from "../../src/core/modules/ticketTranscripts.js";

const user = (id: string, username: string) =>
	({ id, username, globalName: null, avatar: null, bot: false }) as any;
const msg = (id: string, author: any, at: number, content: string) =>
	({
		id,
		author,
		member: null,
		type: 0,
		content,
		createdTimestamp: at,
		editedTimestamp: null,
		reference: null,
		attachments: new Collection(),
		embeds: [],
		stickers: new Collection(),
		mentions: {
			users: new Collection(),
			roles: new Collection(),
			channels: new Collection()
		}
	}) as any;
const channel = (env: string | undefined, apiToken = "") =>
	({
		id: "1500000000000000001",
		name: "general",
		guildId: "1400000000000000001",
		guild: {
			id: "1400000000000000001",
			name: "Test",
			icon: null,
			members: { cache: new Collection() }
		},
		client: { version: { env }, config: { api: { apiToken } } }
	}) as any;

describe("/clear transcript", () => {
	const mod = user("1300000000000000001", "mod");
	const a = user("1300000000000000002", "alice");

	test("the document is one the gateway reads (v 1, channelId = its key), oldest first", () => {
		const id = "1600000000000000001";
		const doc = buildClearTranscript(
			channel("production", "x"),
			[msg("3", a, 3000, "second"), msg("2", a, 2000, "first")],
			mod,
			id,
			5000
		);
		expect(doc.v).toBe(1);
		expect(doc.channelId).toBe(id);
		expect(doc.channelName).toBe("general");
		expect(doc.reason).toBe("clear");
		expect(doc.authorId).toBe(mod.id);
		expect(doc.participants).toEqual([mod.id]);
		expect(doc.staffRoles).toEqual([]);
		expect(doc.messages.map((m) => m.content)).toEqual(["first", "second"]);
		expect(doc.openedAt).toBe(2000);
		expect(doc.closedAt).toBe(5000);
		expect(Object.keys(doc.users).sort()).toEqual([mod.id, a.id].sort());
	});

	test("nothing is stored without a transcript site, or without messages", async () => {
		expect(
			await saveClearTranscript(
				channel("dev"),
				[msg("2", a, 2000, "x")],
				mod
			)
		).toBeNull();
		expect(
			await saveClearTranscript(channel("production", "x"), [], mod)
		).toBeNull();
	});
});
