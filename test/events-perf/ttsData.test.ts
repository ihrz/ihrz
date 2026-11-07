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

import { afterAll, beforeAll, expect, test } from "bun:test";

import { installGuildConfigCache } from "../../src/core/modules/guildConfigCache";

// Importing ttsManager installs the real logger as the global one; keep the
// preload stand-in so the other test files are not affected.
const stubLogger = (globalThis as any).logger;
const { getTTSData, setTTSData } =
	await import("../../src/core/modules/ttsManager");
(globalThis as any).logger = stubLogger;

const store = new Map<string, unknown>();
let reads = 0;

const db = {
	get: async (key: string) => {
		reads++;
		return store.get(key) ?? null;
	},
	set: async (key: string, value: unknown) => {
		store.set(key, value);
	}
};

installGuildConfigCache(db as any);
let previousClient: unknown;
let hadClient = false;

beforeAll(() => {
	hadClient = "client" in globalThis;
	previousClient = (globalThis as any).client;
	(globalThis as any).client = { db };
});

afterAll(() => {
	if (hadClient) (globalThis as any).client = previousClient;
	else delete (globalThis as any).client;
});

test("getTTSData reads the database once for repeated calls", async () => {
	store.set("g1.GUILD.TTS", { enabled: true, voiceChannelId: "v1" });
	reads = 0;

	await getTTSData(client as any, "g1");
	await getTTSData(client as any, "g1");
	const data = await getTTSData(client as any, "g1");

	expect(reads).toBe(1);
	expect(data?.voiceChannelId).toBe("v1");
});

test("getTTSData sees a write made through the database", async () => {
	store.set("g2.GUILD.TTS", { enabled: true, voiceChannelId: "v1" });
	await getTTSData(client as any, "g2");

	await setTTSData(client as any, "g2", {
		enabled: true,
		voiceChannelId: "v2"
	} as any);

	expect((await getTTSData(client as any, "g2"))?.voiceChannelId).toBe("v2");
});

test("getTTSData returns null when disabled or missing", async () => {
	store.set("g3.GUILD.TTS", { enabled: false });

	expect(await getTTSData(client as any, "g3")).toBeNull();
	expect(await getTTSData(client as any, "g4")).toBeNull();
});
