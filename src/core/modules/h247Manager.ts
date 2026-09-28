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

import {
	BaseGuildVoiceChannel,
	ChannelType,
	Client,
	GatewayOpcodes,
	Guild,
	PermissionFlagsBits
} from "discord.js";

import type { Player, VoicePacket, VoiceState } from "lavalink-client";

import { DatabaseStructure } from "../../../types/database_structure.js";

import logger from "../logger.js";
import wait from "../functions/wait.js";

const H247_REJOIN_DELAY_MS = 1_000;
const H247_REJOIN_RETRY_MS = 2_000;
const H247_REJOIN_MAX_ATTEMPTS = 3;
const H247_JOIN_CONFIRM_INTERVAL_MS = 300;
const H247_JOIN_CONFIRM_ATTEMPTS = 8;
const H247_DISCONNECT_OBSERVE_INTERVAL_MS = 500;
const H247_DISCONNECT_OBSERVE_ATTEMPTS = 10;
const H247_EVENT_REJOIN_COOLDOWN_MS = 5_000;
const H247_WATCHDOG_WARN_INTERVAL_MS = 30 * 60_000;
const H247_NEGATIVE_CACHE_TTL_MS = 30 * 60_000;

// In-memory mirror of the enabled H24/7 sessions, required to keep the
// "playerQueueEmptyEnd" handling synchronous against the internal destroy.
const h247Sessions = new Map<string, string>();

// Guilds resolved as "H24/7 not enabled" with the resolution timestamp.
// Avoids a database read for every guild on each watchdog tick.
const h247NegativeCache = new Map<string, number>();

// Last rejoin attempt per guild from the voice state handler.
// Prevents tight rejoin loops when Discord fights back.
const h247EventRejoinCooldowns = new Map<string, number>();

// Last watchdog warning per guild. Failures (missing perms, deleted
// channel) are retried silently until this interval elapses.
const h247WatchdogWarns = new Map<string, number>();

interface H247VoiceSession {
	channelId: string;
	sessionId: string | null;
	token: string | null;
	endpoint: string | null;
}

// Voice handshake data of parked guilds. Discord only dispatches the voice
// server payload on a fresh session, and lavalink-client drops raw packets
// while no player exists (the steady state of a parked guild). Caching the
// credentials lets any future player complete its node-side handshake.
const h247VoiceSessions = new Map<string, H247VoiceSession>();

function ensureH247VoiceSession(guildId: string, channelId: string): void {
	const session = h247VoiceSessions.get(guildId);

	if (session) {
		session.channelId = channelId;
		return;
	}

	h247VoiceSessions.set(guildId, {
		channelId,
		sessionId: null,
		token: null,
		endpoint: null
	});
}

export function handleH247RawVoicePacket(client: Client, data: unknown): void {
	if (!data || typeof data !== "object" || !("t" in data) || !("d" in data)) {
		return;
	}

	const packet = data as { t: string; d: Record<string, unknown> };
	const payload = packet.d;

	if (!payload || typeof payload.guild_id !== "string") return;

	const guildId = payload.guild_id;

	if (packet.t === "VOICE_SERVER_UPDATE") {
		const session = h247VoiceSessions.get(guildId);

		if (!session) return;

		session.token =
			typeof payload.token === "string" ? payload.token : null;
		session.endpoint =
			typeof payload.endpoint === "string" ? payload.endpoint : null;
		return;
	}

	if (packet.t === "VOICE_STATE_UPDATE") {
		if (payload.user_id !== client.user?.id) return;

		const session = h247VoiceSessions.get(guildId);

		if (!session) return;

		if (typeof payload.session_id === "string") {
			session.sessionId = payload.session_id;
		}

		if (typeof payload.channel_id === "string") {
			session.channelId = payload.channel_id;
		}
	}
}

export async function handleH247PlayerCreated(
	client: Client,
	guildId: string
): Promise<void> {
	const session = h247VoiceSessions.get(guildId);

	if (!session?.token || !session.endpoint || !session.sessionId) return;

	const statePacket: VoicePacket = {
		t: "VOICE_STATE_UPDATE",
		d: {
			op: "voiceUpdate",
			guildId,
			guild_id: guildId,
			user_id: client.user!.id,
			session_id: session.sessionId,
			channel_id: session.channelId,
			event: {
				token: session.token,
				guild_id: guildId,
				endpoint: session.endpoint
			},
			deaf: true,
			mute: false,
			self_deaf: true,
			self_mute: false,
			self_video: false,
			self_stream: false,
			suppress: false,
			request_to_speak_timestamp: false
		} as VoiceState
	};

	client.player.sendRawData(statePacket);

	const serverPacket: VoicePacket = {
		t: "VOICE_SERVER_UPDATE",
		d: {
			token: session.token,
			guild_id: guildId,
			endpoint: session.endpoint
		}
	};

	client.player.sendRawData(serverPacket);
}

export async function getH247Data(
	client: Client,
	guildId: string
): Promise<DatabaseStructure.H247Schema | null> {
	return (
		((await client.db.get(`${guildId}.GUILD.H247`)) as
			DatabaseStructure.H247Schema | undefined) ?? null
	);
}

export async function setH247Data(
	client: Client,
	guildId: string,
	data: DatabaseStructure.H247Schema
): Promise<void> {
	await client.db.set(`${guildId}.GUILD.H247`, data);

	if (data.enabled) {
		h247Sessions.set(guildId, data.voiceChannelId);
		h247NegativeCache.delete(guildId);
	} else {
		h247Sessions.delete(guildId);
	}
}

export async function deleteH247Data(
	client: Client,
	guildId: string
): Promise<void> {
	await client.db.delete(`${guildId}.GUILD.H247`);

	h247Sessions.delete(guildId);
	h247VoiceSessions.delete(guildId);
	h247NegativeCache.delete(guildId);
	h247EventRejoinCooldowns.delete(guildId);
	h247WatchdogWarns.delete(guildId);
}

async function fetchH247VoiceChannel(
	guild: Guild,
	voiceChannelId: string
): Promise<BaseGuildVoiceChannel | null> {
	const channel =
		guild.channels.cache.get(voiceChannelId) ??
		(await guild.channels.fetch(voiceChannelId).catch(() => null));

	if (!channel || channel.type !== ChannelType.GuildVoice) return null;

	return channel as BaseGuildVoiceChannel;
}

function sendH247VoiceStateUpdate(
	guild: Guild,
	channelId: string | null
): boolean {
	const shard = guild.shard;

	if (!shard) return false;

	shard.send({
		op: GatewayOpcodes.VoiceStateUpdate,
		d: {
			guild_id: guild.id,
			channel_id: channelId,
			self_deaf: true,
			self_mute: false
		}
	});

	return true;
}

async function waitForH247VoiceConnection(
	guild: Guild,
	voiceChannelId: string
): Promise<boolean> {
	for (let attempt = 0; attempt < H247_JOIN_CONFIRM_ATTEMPTS; attempt++) {
		await wait(H247_JOIN_CONFIRM_INTERVAL_MS);

		if (guild.members.me?.voice.channelId === voiceChannelId) return true;
	}

	return false;
}

async function waitForH247VoiceDisconnection(
	guild: Guild,
	voiceChannelId: string
): Promise<boolean> {
	for (
		let attempt = 0;
		attempt < H247_DISCONNECT_OBSERVE_ATTEMPTS;
		attempt++
	) {
		if (guild.members.me?.voice.channelId !== voiceChannelId) return true;

		await wait(H247_DISCONNECT_OBSERVE_INTERVAL_MS);
	}

	return false;
}

export async function joinH247VoiceChannel(
	guild: Guild,
	voiceChannelId: string,
	confirmConnection: boolean = true,
	force: boolean = false
): Promise<boolean> {
	const me = guild.members.me;

	if (!me) return false;

	const channel = await fetchH247VoiceChannel(guild, voiceChannelId);

	if (!channel) return false;

	if (
		!me
			.permissionsIn(channel.id)
			.has([PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])
	) {
		return false;
	}

	// The voice cache can wrongly report a dead session as alive. Callers
	// repairing a known-broken connection pass force to re-emit the voice
	// state update, which is idempotent on Discord's side.
	if (me.voice.channelId === channel.id && !force) return true;

	ensureH247VoiceSession(guild.id, channel.id);

	const sent = sendH247VoiceStateUpdate(guild, channel.id);

	if (!sent) return false;

	if (!confirmConnection) return true;

	const connected = await waitForH247VoiceConnection(guild, channel.id);

	if (!connected) {
		logger.warn(
			`iHorizon did not receive a voice state for the H24/7 channel ${channel.id} of guild ${guild.id}`
		);
	}

	return connected;
}

export async function leaveCurrentVoiceConnection(guild: Guild): Promise<void> {
	h247VoiceSessions.delete(guild.id);

	sendH247VoiceStateUpdate(guild, null);
}

export async function recoverH247Sessions(client: Client): Promise<void> {
	for (const guild of client.guilds.cache.values()) {
		// Only the sub-key is needed: never pull the whole guild document.
		const data = await client.db.get<
			DatabaseStructure.DbGuildObject["H247"]
		>(`${guild.id}.GUILD.H247`);

		if (!data?.enabled || !data.voiceChannelId) continue;

		h247Sessions.set(guild.id, data.voiceChannelId);

		ensureH247VoiceSession(guild.id, data.voiceChannelId);

		await joinH247VoiceChannel(guild, data.voiceChannelId, false);
	}
}

// Emitted by the internal empty queue timer right before it destroys the
// player. Destroying first with "disconnect = false" wins the synchronous
// internal_destroystatus guard, so lavalink never sends the voice leave and
// iHorizon stays in its H24/7 channel without any visible reconnection.
export function handleH247PlayerIdleDestroy(player: Player): void {
	const voiceChannelId = h247Sessions.get(player.guildId);

	if (!voiceChannelId) return;
	if (player.voiceChannelId !== voiceChannelId) return;

	void player.destroy("QueueEmpty", false).catch((error) => {
		logger.err(
			`Failed to gracefully destroy the H24/7 player of guild ${player.guildId}:`,
			error
		);
	});
}

export async function handleH247PlayerDestroyed(
	client: Client,
	guildId: string
): Promise<void> {
	const data = await getH247Data(client, guildId);

	if (!data?.enabled || !data.voiceChannelId) return;

	const guild = client.guilds.cache.get(guildId);

	if (!guild) return;

	// Re-prime the in-memory mirror from the database: it can be empty when
	// the guild was unavailable at boot or the shard resumed since.
	h247Sessions.set(guildId, data.voiceChannelId);
	ensureH247VoiceSession(guildId, data.voiceChannelId);

	for (let attempt = 0; attempt < H247_REJOIN_MAX_ATTEMPTS; attempt++) {
		await wait(attempt === 0 ? H247_REJOIN_DELAY_MS : H247_REJOIN_RETRY_MS);

		if (client.player.getPlayer(guildId)) return;

		// The player always disconnects before "playerDestroy" is emitted,
		// but Discord may still report a stale voice state. Wait for the
		// leave to be observed, then force a fresh voice state update: it
		// is idempotent and repairs a dead session that the cache wrongly
		// reports as alive instead of trusting it and giving up.
		await waitForH247VoiceDisconnection(guild, data.voiceChannelId);

		const joined = await joinH247VoiceChannel(
			guild,
			data.voiceChannelId,
			true,
			true
		);

		if (joined) return;
	}

	logger.warn(
		`Unable to restore the H24/7 voice connection for guild ${guildId} after the player was destroyed`
	);
}

// Reads the persisted H24/7 state and restores the voice presence when the
// bot is not (or no longer) in the expected channel. Quiet on success path
// checks so the periodic watchdog stays cheap and log-free.
export async function ensureH247VoicePresence(
	client: Client,
	guildId: string
): Promise<boolean> {
	const data = await getH247Data(client, guildId);

	if (!data?.enabled || !data.voiceChannelId) {
		h247Sessions.delete(guildId);
		return false;
	}

	const guild = client.guilds.cache.get(guildId);

	if (!guild) return false;

	h247Sessions.set(guildId, data.voiceChannelId);
	ensureH247VoiceSession(guildId, data.voiceChannelId);

	if (guild.members.me?.voice.channelId === data.voiceChannelId) return true;

	const joined = await joinH247VoiceChannel(guild, data.voiceChannelId);

	if (!joined) {
		const now = Date.now();
		const lastWarn = h247WatchdogWarns.get(guildId) ?? 0;

		if (now - lastWarn >= H247_WATCHDOG_WARN_INTERVAL_MS) {
			h247WatchdogWarns.set(guildId, now);
			logger.warn(
				`Unable to restore the H24/7 voice connection for guild ${guildId} (channel ${data.voiceChannelId})`
			);
		}

		return false;
	}

	h247WatchdogWarns.delete(guildId);
	logger.log(
		`Restored the H24/7 voice connection for guild ${guildId} (channel ${data.voiceChannelId})`
	);

	return true;
}

// Periodic safety net for everything the event-driven paths can miss:
// guilds unavailable at boot, dropped gateway events, expired voice
// sessions after long uptimes. Steady-state cost is a map lookup per
// guild; the database is only read on mismatch or unknown guilds.
export async function watchdogH247Sessions(client: Client): Promise<void> {
	for (const guild of client.guilds.cache.values()) {
		try {
			const expected = h247Sessions.get(guild.id);

			if (expected && guild.members.me?.voice.channelId === expected) {
				continue;
			}

			if (!expected) {
				const lastNegative = h247NegativeCache.get(guild.id) ?? 0;

				if (Date.now() - lastNegative < H247_NEGATIVE_CACHE_TTL_MS) {
					continue;
				}

				const data = await getH247Data(client, guild.id);

				if (!data?.enabled || !data.voiceChannelId) {
					h247NegativeCache.set(guild.id, Date.now());
					continue;
				}

				h247NegativeCache.delete(guild.id);
			}

			await ensureH247VoicePresence(client, guild.id);
		} catch (error) {
			logger.err(`H24/7 watchdog failed for guild ${guild.id}:`, error);
		}
	}
}

// Rejoin entry point for the voice state handler. Cooldown-guarded so a
// move-fight with an admin (or a burst of gateway updates) cannot loop.
export async function handleH247VoiceStateChange(
	client: Client,
	guildId: string
): Promise<void> {
	const now = Date.now();
	const lastAttempt = h247EventRejoinCooldowns.get(guildId) ?? 0;

	if (now - lastAttempt < H247_EVENT_REJOIN_COOLDOWN_MS) return;

	h247EventRejoinCooldowns.set(guildId, now);

	try {
		await ensureH247VoicePresence(client, guildId);
	} catch (error) {
		logger.err(
			`Failed to restore the H24/7 voice connection for guild ${guildId} after a voice state change:`,
			error
		);
	}
}
