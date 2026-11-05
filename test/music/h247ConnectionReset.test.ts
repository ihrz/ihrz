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

import { afterEach, expect, test } from "bun:test";

import { ChannelType } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";

import {
	deleteH247Data,
	joinH247VoiceChannel
} from "../../src/core/modules/h247Manager.ts";

const CHANNEL_ID = "200";

let guildSeq = 0;
const usedGuildIds: string[] = [];

// A guild driving the real djs-voice connection through a fake adapter:
// Discord's voice state is mirrored from the payloads the library sends.
function makeGuild(store: Map<string, unknown>) {
	const id = `h247-reset-${++guildSeq}`;
	const payloads: (string | null)[] = [];
	const voice = { channelId: null as string | null };

	usedGuildIds.push(id);

	const client = {
		db: {
			get: async (key: string) => store.get(key),
			set: async (key: string, value: unknown) => {
				store.set(key, value);
			},
			delete: async (key: string) => {
				store.delete(key);
			}
		}
	};

	const guild = {
		id,
		client,
		members: {
			me: {
				voice,
				permissionsIn: () => ({ has: () => true })
			}
		},
		channels: {
			cache: {
				get: () => ({ id: CHANNEL_ID, type: ChannelType.GuildVoice })
			}
		},
		voiceAdapterCreator: () => ({
			sendPayload: (payload: { d: { channel_id: string | null } }) => {
				payloads.push(payload.d.channel_id);
				voice.channelId = payload.d.channel_id;
				return true;
			},
			destroy: () => {}
		})
	};

	store.set(`${id}.GUILD.H247`, {
		enabled: true,
		voiceChannelId: CHANNEL_ID
	});
	store.set(`${id}.GUILD.H247_TAKEOVER`, {
		sessionId: "s",
		token: "t",
		endpoint: "e",
		updatedAt: 1
	});

	return { guild: guild as any, payloads, voice };
}

async function until(check: () => boolean): Promise<void> {
	for (let attempt = 0; attempt < 100 && !check(); attempt++) {
		await new Promise((resolve) => setTimeout(resolve, 20));
	}

	expect(check()).toBe(true);
}

const socketClosed = () =>
	new Error("Cannot perform IP discovery - socket closed");

afterEach(async () => {
	for (const id of usedGuildIds.splice(0)) {
		getVoiceConnection(id)?.destroy();
		await deleteH247Data(
			{ db: { delete: async () => {} } } as any,
			id
		);
	}
});

test("a connection error is handled, and two of them keep the session", async () => {
	const store = new Map<string, unknown>();
	const { guild, payloads } = makeGuild(store);

	await joinH247VoiceChannel(guild, CHANNEL_ID, false, true);

	const connection = getVoiceConnection(guild.id)!;

	// Throws without a listener, like the unhandled rejections in production.
	connection.emit("error", socketClosed());
	connection.emit("error", socketClosed());

	await new Promise((resolve) => setTimeout(resolve, 50));

	expect(getVoiceConnection(guild.id)).toBe(connection);
	expect(store.has(`${guild.id}.GUILD.H247_TAKEOVER`)).toBe(true);
	expect(payloads).toEqual([CHANNEL_ID]);
});

test("the third error drops the stored connection and joins again", async () => {
	const store = new Map<string, unknown>();
	const { guild, payloads, voice } = makeGuild(store);

	await joinH247VoiceChannel(guild, CHANNEL_ID, false, true);

	const connection = getVoiceConnection(guild.id)!;

	for (let i = 0; i < 3; i++) connection.emit("error", socketClosed());

	await until(() => {
		const current = getVoiceConnection(guild.id);
		return !!current && current !== connection;
	});

	expect(store.has(`${guild.id}.GUILD.H247_TAKEOVER`)).toBe(false);
	// The H24/7 setting survives: only the connection data is reset.
	expect(store.get(`${guild.id}.GUILD.H247`)).toEqual({
		enabled: true,
		voiceChannelId: CHANNEL_ID
	});
	expect(payloads).toEqual([CHANNEL_ID, null, CHANNEL_ID]);
	expect(voice.channelId).toBe(CHANNEL_ID);
});

test("a connection that keeps failing is not reset again during the cooldown", async () => {
	const store = new Map<string, unknown>();
	const { guild, payloads } = makeGuild(store);

	await joinH247VoiceChannel(guild, CHANNEL_ID, false, true);

	const first = getVoiceConnection(guild.id)!;

	for (let i = 0; i < 3; i++) first.emit("error", socketClosed());

	await until(() => {
		const current = getVoiceConnection(guild.id);
		return !!current && current !== first;
	});
	await new Promise((resolve) => setTimeout(resolve, 50));

	const second = getVoiceConnection(guild.id)!;

	for (let i = 0; i < 3; i++) second.emit("error", socketClosed());

	await new Promise((resolve) => setTimeout(resolve, 50));

	expect(getVoiceConnection(guild.id)).toBe(second);
	expect(payloads).toEqual([CHANNEL_ID, null, CHANNEL_ID]);
});

test("no reset when H24/7 was turned off in the meantime", async () => {
	const store = new Map<string, unknown>();
	const { guild, payloads } = makeGuild(store);

	await joinH247VoiceChannel(guild, CHANNEL_ID, false, true);

	store.delete(`${guild.id}.GUILD.H247`);

	const connection = getVoiceConnection(guild.id)!;

	for (let i = 0; i < 3; i++) connection.emit("error", socketClosed());

	await new Promise((resolve) => setTimeout(resolve, 50));

	expect(getVoiceConnection(guild.id)).toBe(connection);
	expect(payloads).toEqual([CHANNEL_ID]);
});
