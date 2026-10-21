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
	Guild,
	PermissionFlagsBits
} from "discord.js";

import { getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";

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
const H247_TAKEOVER_VERIFY_INTERVAL_MS = 1_000;
const H247_TAKEOVER_VERIFY_ATTEMPTS = 10;

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
	// True while the credentials belong to a pre-restart session replayed
	// from the database instead of a handshake observed since this boot.
	takeover: boolean;
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
		endpoint: null,
		takeover: false
	});
}

// Strong credentials become the replayable takeover payload. The raw
// packet stream also covers TTS-only guilds, so only an enabled H24/7
// guild is persisted. Fired and forgotten: a failed write only costs
// the escalation into the slower rejoin path on the next boot.
function persistH247Takeover(
	client: Client,
	guildId: string,
	session: H247VoiceSession
): void {
	if (!h247Sessions.has(guildId)) return;

	// Local copies: TypeScript does not carry the narrowing of guarded
	// properties when the interface declares them as nullable.
	const { sessionId, token, endpoint } = session;

	if (!sessionId || !token || !endpoint) return;

	const takeover: DatabaseStructure.H247TakeoverSchema = {
		sessionId,
		token,
		endpoint,
		updatedAt: Date.now()
	};

	client.db.set(`${guildId}.GUILD.H247_TAKEOVER`, takeover).catch((error) => {
		logger.err(
			`Failed to persist the H24/7 takeover credentials of guild ${guildId}:`,
			error
		);
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

		const previousToken = session.token;

		session.token =
			typeof payload.token === "string" ? payload.token : null;
		session.endpoint =
			typeof payload.endpoint === "string" ? payload.endpoint : null;

		if (session.token && session.token !== previousToken) {
			session.takeover = false;

			persistH247Takeover(client, guildId, session);
		}

		return;
	}

	if (packet.t === "VOICE_STATE_UPDATE") {
		if (payload.user_id !== client.user?.id) return;

		const session = h247VoiceSessions.get(guildId);

		if (!session) return;

		const previousSessionId = session.sessionId;

		if (typeof payload.session_id === "string") {
			session.sessionId = payload.session_id;
		}

		if (typeof payload.channel_id === "string") {
			session.channelId = payload.channel_id;
		}

		if (session.sessionId && session.sessionId !== previousSessionId) {
			// A new session generation rotated in, the credentials held for
			// takeover were issued for the previous one.
			session.takeover = false;

			persistH247Takeover(client, guildId, session);
		}
	}
}

// Feeds a freshly created player with the currently cached handshake so
// it connects node-side without the bot ever re-emitting a voice state.
function sendH247VoiceCredentials(
	client: Client,
	guildId: string,
	session: H247VoiceSession
): void {
	const { sessionId, token, endpoint } = session;

	if (!sessionId || !token || !endpoint) return;

	const statePacket: VoicePacket = {
		t: "VOICE_STATE_UPDATE",
		d: {
			op: "voiceUpdate",
			guildId,
			guild_id: guildId,
			user_id: client.user!.id,
			session_id: sessionId,
			channel_id: session.channelId,
			event: {
				token,
				guild_id: guildId,
				endpoint
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
			token,
			guild_id: guildId,
			endpoint
		}
	};

	client.player.sendRawData(serverPacket);
}

export async function handleH247PlayerCreated(
	client: Client,
	guildId: string
): Promise<void> {
	const session = h247VoiceSessions.get(guildId);

	if (!session?.token || !session.endpoint || !session.sessionId) return;

	sendH247VoiceCredentials(client, guildId, session);

	// Replayed credentials were issued before the crash: when Discord
	// reclaimed the session in between, the node never connects and
	// playback stays silent. Poll the player state, then rotate once by
	// re-issuing the voice state update (idempotent on Discord's side).
	if (!session.takeover) return;

	for (let attempt = 0; attempt < H247_TAKEOVER_VERIFY_ATTEMPTS; attempt++) {
		await wait(H247_TAKEOVER_VERIFY_INTERVAL_MS);

		if (client.player.getPlayer(guildId)?.connected) return;
	}

	const voiceChannelId = h247Sessions.get(guildId);
	const guild = client.guilds.cache.get(guildId);

	if (!voiceChannelId || !guild) return;

	logger.warn(
		`H24/7 takeover credentials of guild ${guildId} were rejected, rotating the voice session`
	);

	h247VoiceSessions.delete(guildId);

	if (!(await joinH247VoiceChannel(guild, voiceChannelId, true, true))) {
		return;
	}

	// Wait for the fresh generation dispatched after the forced rejoin.
	for (let attempt = 0; attempt < H247_TAKEOVER_VERIFY_ATTEMPTS; attempt++) {
		const fresh = h247VoiceSessions.get(guildId);

		if (fresh?.token && fresh.sessionId) {
			sendH247VoiceCredentials(client, guildId, fresh);
			return;
		}

		await wait(H247_TAKEOVER_VERIFY_INTERVAL_MS);
	}
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
	await client.db.delete(`${guildId}.GUILD.H247_TAKEOVER`);

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

// djs-voice owns the H24/7 voice session: messaging the same channel back
// re-adopts an orphaned pre-restart session without any observable
// rotation, and the gateway + UDP keepalives it holds afterwards prevent
// Discord from reclaiming the session after the idle timeout.
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

	joinVoiceChannel({
		guildId: guild.id,
		channelId: channel.id,
		adapterCreator: guild.voiceAdapterCreator,
		selfDeaf: true,
		selfMute: false
	});

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

	// The takeover credentials belong to the session we are leaving.
	await guild.client.db
		.delete(`${guild.id}.GUILD.H247_TAKEOVER`)
		.catch(() => {});

	// djs-voice emits the leave on the voice gateway itself, cleanly both
	// sides of the session.
	getVoiceConnection(guild.id)?.destroy();
}

// Prepares the takeover of a voice session Discord still holds after a
// fast restart. Valid only when the restored cache reports the bot
// inside the H24/7 channel with the exact session generation the token
// was issued for, otherwise the credentials are stale and the slow
// rejoin path must rotate them.
function hydrateH247Takeover(
	guild: Guild,
	data: DatabaseStructure.H247Schema,
	takeover: DatabaseStructure.H247TakeoverSchema
): boolean {
	const me = guild.members.me;

	if (!me) return false;

	if (me.voice.channelId !== data.voiceChannelId) return false;

	if (me.voice.sessionId !== takeover.sessionId) return false;

	const session = h247VoiceSessions.get(guild.id);

	if (!session) return false;

	session.sessionId = takeover.sessionId;
	session.token = takeover.token;
	session.endpoint = takeover.endpoint;
	session.takeover = true;

	return true;
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

		// Fast-restart path: Discord still holds the pre-restart session,
		// the djs-voice join below re-adopts it by messaging the same
		// channel back instead of rotating it into a fresh one — an
		// observable leave/join would break the channel's live streak.
		const takeover = await client.db.get<
			DatabaseStructure.DbGuildObject["H247_TAKEOVER"]
		>(`${guild.id}.GUILD.H247_TAKEOVER`);

		if (takeover) hydrateH247Takeover(guild, data, takeover);

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

		// djs-voice still holds the session: the player is simply gone and
		// the next play re-attaches it from the cached handshake. The voice
		// state stays put, no repair and no observable rotation.
		if (
			guild.members.me?.voice.channelId === data.voiceChannelId &&
			getVoiceConnection(guildId)
		) {
			return;
		}

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
