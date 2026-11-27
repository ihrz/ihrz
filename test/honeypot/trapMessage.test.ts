import { describe, expect, test } from "bun:test";
import { ComponentType, MessageFlags } from "discord.js";

import {
	HONEYPOT_COUNT_BUTTON,
	buildTrapMessage,
	recordTrigger,
	saveHoneypotConfig
} from "../../src/core/modules/honeypotManager.ts";
import en from "../../src/lang/en-US.ts";

type Json = Record<string, unknown>;
type Client = Parameters<typeof recordTrigger>[0];
type Guild = Parameters<typeof recordTrigger>[1];

function button(message: ReturnType<typeof buildTrapMessage>): Json {
	const container = message.components[0].toJSON() as unknown as Json;
	const row = (container.components as Json[]).find(
		(c) => c.type === ComponentType.ActionRow
	) as { components: Json[] };
	return row.components[0];
}

type Stored = {
	caughtCount?: number;
	lastSanctionedAt?: number;
	lastTriggeredAt?: number;
	action?: string;
};
const stored = (client: { store: Map<string, Json> }) =>
	(client.store.get("1.GUILD.HONEYPOT") ?? {}) as Stored;

function fakeClient(initial: Json | null) {
	const store = new Map<string, unknown>();
	if (initial) store.set("1.GUILD.HONEYPOT", initial);
	return {
		store,
		db: {
			get: async (key: string) => structuredClone(store.get(key) ?? null),
			set: async (key: string, value: unknown) => {
				store.set(key, structuredClone(value));
			}
		}
	} as unknown as Client & { store: Map<string, Json> };
}

// No channel: the trap refresh scheduled after a sanction finds nothing.
const guild = {
	id: "1",
	channels: { fetch: async () => null }
} as unknown as Guild;

describe("honeypot trap message", () => {
	test("is a Components V2 card with the counter button", () => {
		const message = buildTrapMessage(en, 0);
		expect(message.flags).toBe(MessageFlags.IsComponentsV2);
		const container = message.components[0].toJSON() as unknown as Json;
		expect(container.type).toBe(ComponentType.Container);
		expect(JSON.stringify(container)).toContain(
			en.honeypot_trap_embed_title
		);
		expect(button(message).custom_id).toBe(HONEYPOT_COUNT_BUTTON);
	});

	test("the button says how many accounts were sanctioned", () => {
		expect(button(buildTrapMessage(en, 0)).label).toBe(
			en.honeypot_trap_count_none
		);
		expect(button(buildTrapMessage(en, 1)).label).toBe(
			en.honeypot_trap_count_one
		);
		expect(button(buildTrapMessage(en, 42)).label).toBe(
			"42 people sanctioned"
		);
	});
});

describe("honeypot counter", () => {
	test("only a sanction that went through counts", async () => {
		const client = fakeClient({ enabled: true, action: "ban" });
		await recordTrigger(client, guild, false); // staff: the bot could not ban
		expect(stored(client).caughtCount).toBeUndefined();
		expect(stored(client).lastTriggeredAt).toBeNumber();

		await Promise.all([
			recordTrigger(client, guild, true),
			recordTrigger(client, guild, true)
		]);
		const config = stored(client);
		expect(config.caughtCount).toBe(2);
		expect(config.lastSanctionedAt).toBeNumber();
	});

	test("a deleted config is not written back", async () => {
		const client = fakeClient(null);
		await recordTrigger(client, guild, true);
		expect(client.store.has("1.GUILD.HONEYPOT")).toBe(false);
	});

	test("a panel kept open keeps the counters", async () => {
		const client = fakeClient({
			enabled: true,
			action: "kick",
			caughtCount: 7,
			lastSanctionedAt: 5,
			lastTriggeredAt: 5
		});
		const panel = { enabled: true, action: "ban" as const, caughtCount: 2 };
		await saveHoneypotConfig(client, "1", panel);
		const config = stored(client);
		expect(config.action).toBe("ban");
		expect(config.caughtCount).toBe(7);
		expect(config.lastSanctionedAt).toBe(5);
	});
});
