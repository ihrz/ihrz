import { describe, expect, test } from "bun:test";

import {
	isModuleDisabled,
	replyIfModuleDisabled
} from "../../src/core/functions/moduleToggle.ts";
import en from "../../src/lang/en-US.ts";

type Client = Parameters<typeof isModuleDisabled>[0];
type Source = Parameters<typeof replyIfModuleDisabled>[1];

function fakeClient(values: Record<string, unknown>) {
	const sent: string[] = [];
	const client = {
		db: { get: async (key: string) => values[key] ?? null },
		func: {
			method: {
				interactionSend: async (
					_i: unknown,
					o: { content: string }
				) => {
					sent.push(o.content);
				}
			}
		}
	} as unknown as Client;
	return { client, sent };
}

// A slash interaction: it has isRepliable() (method/source.ts::isInteraction) and a user.
const slash = {
	guildId: "1",
	user: { id: "42" },
	isRepliable: () => true
} as unknown as Source;

describe("isModuleDisabled", () => {
	test("each module reads its own switch", async () => {
		const { client } = fakeClient({
			"1.GUILD.FUN.states": "off",
			"1.ECONOMY.disabled": true,
			"1.GUILD.TICKET.disable": true
		});
		expect(await isModuleDisabled(client, "1", "fun")).toBe(true);
		expect(await isModuleDisabled(client, "1", "economy")).toBe(true);
		expect(await isModuleDisabled(client, "1", "ticket")).toBe(true);
	});

	test("anything else is on", async () => {
		const { client } = fakeClient({
			"1.GUILD.FUN.states": "on",
			"1.ECONOMY.disabled": false
		});
		expect(await isModuleDisabled(client, "1", "fun")).toBe(false);
		expect(await isModuleDisabled(client, "1", "economy")).toBe(false);
		expect(await isModuleDisabled(client, "1", "ticket")).toBe(false);
		expect(await isModuleDisabled(client, null, "fun")).toBe(false);
	});
});

describe("replyIfModuleDisabled", () => {
	test("answers with the module's refusal and stops the command", async () => {
		const { client, sent } = fakeClient({ "1.ECONOMY.disabled": true });
		expect(await replyIfModuleDisabled(client, slash, en, "economy")).toBe(
			true
		);
		expect(sent).toEqual([
			en.economy_disable_msg.replace("${authorId}", "42")
		]);
	});

	test("a command's own message wins", async () => {
		const { client, sent } = fakeClient({ "1.GUILD.TICKET.disable": true });
		await replyIfModuleDisabled(
			client,
			slash,
			en,
			"ticket",
			en.open_disabled_command
		);
		expect(sent).toEqual([en.open_disabled_command]);
	});

	test("says nothing when the module is on", async () => {
		const { client, sent } = fakeClient({});
		expect(await replyIfModuleDisabled(client, slash, en, "fun")).toBe(
			false
		);
		expect(sent).toEqual([]);
	});
});
