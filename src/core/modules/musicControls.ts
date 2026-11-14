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

/*
 * Playback controls of the /music commands (pause, resume, skip, stop,
 * shuffle, clear-queue, loop, volume), shared with the dashboard and the
 * Discord Activity (gatewayLinkActions/music.ts) and the now playing panel's
 * buttons. Each function keeps the checks of its command, in the same order:
 * the command maps the refusal to its own message.
 *
 * Who controls what (musicRights):
 * - everyone in the bot's voice channel adds tracks and removes their own;
 * - the requester of the track playing controls it: pause, resume, skip,
 *   volume ("requester_only" for the others);
 * - managers control everything: the server's owner, Administrator, Manage
 *   Server, iHorizon's owners ("manager_only" for the others: previous,
 *   shuffle, loop, stop, jump in the queue, others' tracks);
 * - alone with the bot, a listener is a manager; when the requester is no
 *   longer in the channel, the track playing is anyone's.
 */

import {
	BaseGuildTextChannel,
	Client,
	EmbedBuilder,
	GuildMember,
	PermissionFlagsBits
} from "discord.js";

import { LanguageData } from "../../../types/languageData.js";
import { destroyPlayerSafely, playerNodeReady } from "./audioNode.js";
import { crossfadeSkip } from "./musicCrossfadeSkip.js";
import { markPaused } from "./trackClock.js";
import { cleanupTTS, getTTSData } from "./ttsManager.js";

export type MusicPlayer = NonNullable<
	ReturnType<Client["player"]["getPlayer"]>
>;
export type RepeatMode = "off" | "track" | "queue";
export const REPEAT_MODES: readonly RepeatMode[] = ["off", "track", "queue"];

export type MusicRefusal =
	// The member is in no voice channel.
	| "not_in_voice"
	// No player, or nothing playing.
	| "nothing_playing"
	// The member is not in the bot's voice channel.
	| "not_same_channel"
	// /music shuffle: fewer than 2 tracks queued.
	| "not_enough_tracks"
	// The audio node is restarting (audioNode.ts): the player comes back
	// on its own, the controls that need the node wait for it.
	| "audio_unavailable"
	// The track playing belongs to someone else (its requester or a manager).
	| "requester_only"
	// Only a manager can (see musicRights).
	| "manager_only";

export type MusicControlResult<T = object> =
	({ ok: true } & T) | { ok: false; reason: MusicRefusal };

const refuse = (reason: MusicRefusal) => ({ ok: false, reason }) as const;

const inBotChannel = (member: GuildMember): boolean =>
	member.voice.channelId === member.guild.members.me?.voice.channelId;

const playerOf = (client: Client, member: GuildMember) =>
	client.player.getPlayer(member.guild.id);

// lavalink-client marks the players "not playing" while their node is away:
// a track waiting for the node still counts as playing.
const active = (player: MusicPlayer): boolean =>
	player.playing || (!playerNodeReady(player) && !!player.queue.current);

// The controls that talk to the node.
const nodeDown = (player: MusicPlayer): boolean => !playerNodeReady(player);

/** The user id that requested a track (null: unknown, autoplay…). */
export function requesterIdOf(track: unknown): string | null {
	const requester = (track as { requester?: { id?: unknown } } | null)
		?.requester;
	return typeof requester?.id === "string" ? requester.id : null;
}

export interface MusicRights {
	// Everything: owner, Administrator, Manage Server, iHorizon owner, or
	// alone with the bot.
	manager: boolean;
	// The track playing: a manager, its requester, or anyone once its
	// requester left the voice channel.
	current: boolean;
}

/** musicRights without the lookups: `botOwner` already known. */
export function musicRightsOf(
	member: GuildMember,
	player: MusicPlayer | undefined | null,
	botOwner: boolean
): MusicRights {
	const staff =
		botOwner ||
		member.guild.ownerId === member.id ||
		member.permissions.has(PermissionFlagsBits.Administrator) ||
		member.permissions.has(PermissionFlagsBits.ManageGuild);
	const channel = member.guild.members.me?.voice.channel;
	const listeners = channel
		? channel.members.filter((m) => !m.user.bot)
		: null;
	const alone =
		!!listeners && listeners.size === 1 && listeners.has(member.id);
	const manager = staff || alone;
	const requester = requesterIdOf(player?.queue.current);
	const current =
		manager ||
		!requester ||
		requester === member.id ||
		!listeners?.has(requester);
	return { manager, current };
}

export async function musicRights(
	member: GuildMember,
	player: MusicPlayer | undefined | null
): Promise<MusicRights> {
	// On demand: ownerHelper pulls the client's events in (already loaded in
	// the bot). Unknown ⇒ not an owner, the other rights still apply.
	const botOwner = await import("../functions/ownerHelper.js")
		.then(({ isBotOwner }) => isBotOwner(member.id))
		.catch(() => false);
	return musicRightsOf(member, player, botOwner);
}

const needsCurrent = async (member: GuildMember, player: MusicPlayer) =>
	(await musicRights(member, player)).current;
const needsManager = async (member: GuildMember, player: MusicPlayer) =>
	(await musicRights(member, player)).manager;

// /music pause
export async function pauseMusic(
	client: Client,
	member: GuildMember
): Promise<MusicControlResult<{ paused: boolean }>> {
	if (!member.voice.channel) return refuse("not_in_voice");
	const player = playerOf(client, member);
	if (!player || !active(player)) return refuse("nothing_playing");
	if (!inBotChannel(member)) return refuse("not_same_channel");
	if (nodeDown(player)) return refuse("audio_unavailable");
	if (!(await needsCurrent(member, player))) return refuse("requester_only");
	if (!player.paused) {
		await player.pause();
		markPaused(player, true);
	}
	return { ok: true, paused: !!player.paused };
}

// /music resume
export async function resumeMusic(
	client: Client,
	member: GuildMember
): Promise<MusicControlResult> {
	const player = playerOf(client, member);
	if (!player || !member.voice.channel) return refuse("nothing_playing");
	if (!inBotChannel(member)) return refuse("not_same_channel");
	if (nodeDown(player)) return refuse("audio_unavailable");
	if (!(await needsCurrent(member, player))) return refuse("requester_only");
	// lavalink-client throws when the player isn't paused.
	if (player.paused) {
		await player.resume();
		markPaused(player, false);
	}
	return { ok: true };
}

// /music skip. The skip is announced in the player's text channel unless the
// request came from it.
export async function skipMusic(
	client: Client,
	member: GuildMember,
	lang: LanguageData,
	sourceChannelId: string | null
): Promise<MusicControlResult<{ skipped: string; next: string | null }>> {
	if (!member.voice.channel) return refuse("not_in_voice");
	if (!inBotChannel(member)) return refuse("not_same_channel");

	const player = playerOf(client, member);
	if (!player || !active(player)) return refuse("nothing_playing");
	if (nodeDown(player)) return refuse("audio_unavailable");
	if (!(await needsCurrent(member, player))) return refuse("requester_only");

	const oldName = player.queue.current?.info.title as string;
	const channel = member.guild.channels.cache.get(
		player.textChannelId as string
	);

	if (player.queue.tracks.length >= 1) {
		await crossfadeSkip(player);
	} else {
		await player.stopPlaying();
	}

	if (channel && sourceChannelId !== channel.id) {
		(channel as BaseGuildTextChannel)
			.send({
				embeds: [
					new EmbedBuilder()
						.setColor(2829617)
						.setDescription(
							lang.event_mp_playerSkip
								.replace(
									"${emoji_Music_Icon}",
									client.iHorizon_Emojis.Music_Icon
								)
								.replace("${trackTitle}", oldName)
						)
				]
			})
			.catch(() => null);
	}

	return {
		ok: true,
		skipped: oldName,
		next: player.queue.current?.info.title ?? null
	};
}

/**
 * Back to the previous track (the dashboard's "previous", media keys): the
 * track playing now goes back to the front of the queue and the last played
 * one plays again. Same guards as /music skip. lavalink-client keeps the
 * played tracks in `queue.previous` (25 by default, filled by the crossfade
 * skip too); a replayed track is flagged so it does not go back there.
 */
export async function previousMusic(
	client: Client,
	member: GuildMember
): Promise<
	| MusicControlResult<{ title: string }>
	// Nothing was played before on this player (only this control).
	| { ok: false; reason: "no_previous" }
> {
	if (!member.voice.channel) return refuse("not_in_voice");
	if (!inBotChannel(member)) return refuse("not_same_channel");
	const player = playerOf(client, member);
	if (!player || !player.queue.current) return refuse("nothing_playing");
	if (nodeDown(player)) return refuse("audio_unavailable");
	if (!(await needsManager(member, player))) return refuse("manager_only");
	const previous = await player.queue.shiftPrevious();
	if (!previous) return { ok: false, reason: "no_previous" };

	previous.pluginInfo = {
		...previous.pluginInfo,
		clientData: { ...previous.pluginInfo?.clientData, previousTrack: true }
	};
	await player.queue.add(player.queue.current, 0);
	await player.play({ clientTrack: previous });
	if (player.paused) await player.resume();
	return { ok: true, title: previous.info.title };
}

// /music stop. A TTS session in progress is what gets stopped.
export async function stopMusic(
	client: Client,
	member: GuildMember
): Promise<MusicControlResult<{ tts: boolean }>> {
	if (!inBotChannel(member)) return refuse("not_same_channel");

	const ttsData = await getTTSData(client, member.guild.id);
	if (ttsData && ttsData.enabled) {
		await cleanupTTS(client, member.guild.id);
		return { ok: true, tts: true };
	}

	const player = playerOf(client, member);
	if (!player || !active(player) || !member.voice.channel)
		return refuse("nothing_playing");
	if (!(await needsManager(member, player))) return refuse("manager_only");
	// The node is away: leave and empty the queue here, nothing to tell it.
	if (nodeDown(player)) await destroyPlayerSafely(player, "stop");
	else await player.stopPlaying();
	return { ok: true, tts: false };
}

// /music shuffle
export async function shuffleMusic(
	client: Client,
	member: GuildMember
): Promise<MusicControlResult> {
	const player = playerOf(client, member);
	if (!player || !active(player) || !member.voice.channel)
		return refuse("nothing_playing");
	if (!inBotChannel(member)) return refuse("not_same_channel");
	if (player.queue.tracks.length < 2) return refuse("not_enough_tracks");
	if (!(await needsManager(member, player))) return refuse("manager_only");
	await player.queue.shuffle();
	return { ok: true };
}

// /music clear-queue: removes the upcoming tracks, not the current one. A
// manager empties the queue; anyone else removes their own tracks only
// (`own`), the others' stay.
export async function clearMusicQueue(
	client: Client,
	member: GuildMember
): Promise<MusicControlResult<{ removed: number; own: boolean }>> {
	const player = playerOf(client, member);
	if (!player || !member.voice.channel) return refuse("nothing_playing");
	if (!inBotChannel(member)) return refuse("not_same_channel");
	if (await needsManager(member, player)) {
		const removed = player.queue.tracks.length;
		await player.queue.splice(0, removed);
		return { ok: true, removed, own: false };
	}
	let removed = 0;
	// From the end: the indexes before stay right.
	for (let i = player.queue.tracks.length - 1; i >= 0; i--) {
		if (requesterIdOf(player.queue.tracks[i]) === member.id) {
			await player.queue.splice(i, 1);
			removed++;
		}
	}
	return { ok: true, removed, own: true };
}

/**
 * One upcoming track out of the queue (the player's queue view): its
 * requester or a manager. `identifier` guards against a queue that moved
 * since the listener looked at it.
 */
export async function removeQueuedTrack(
	client: Client,
	member: GuildMember,
	index: number,
	identifier: string | null
): Promise<
	| MusicControlResult<{ title: string }>
	| { ok: false; reason: "track_not_found" | "queue_changed" }
> {
	const player = playerOf(client, member);
	if (!player || !member.voice.channel) return refuse("nothing_playing");
	if (!inBotChannel(member)) return refuse("not_same_channel");
	const track = player.queue.tracks[index];
	if (!track) return { ok: false, reason: "track_not_found" };
	if (identifier !== null && track.info.identifier !== identifier)
		return { ok: false, reason: "queue_changed" };
	if (
		requesterIdOf(track) !== member.id &&
		!(await needsManager(member, player))
	)
		return refuse("requester_only");
	await player.queue.splice(index, 1);
	return { ok: true, title: track.info.title };
}

// /music loop
export async function setMusicLoop(
	client: Client,
	member: GuildMember,
	mode: RepeatMode
): Promise<MusicControlResult> {
	const player = playerOf(client, member);
	if (!player || !active(player) || !member.voice.channel)
		return refuse("nothing_playing");
	if (!inBotChannel(member)) return refuse("not_same_channel");
	if (!(await needsManager(member, player))) return refuse("manager_only");
	await player.setRepeatMode(mode);
	return { ok: true };
}

// /music volume: the requester of the track playing, or a manager (no same
// channel check, as before).
export async function setMusicVolume(
	client: Client,
	member: GuildMember,
	volume: number
): Promise<MusicControlResult> {
	const player = playerOf(client, member);
	if (!player || !active(player) || !member.voice.channel)
		return refuse("nothing_playing");
	if (nodeDown(player)) return refuse("audio_unavailable");
	if (!(await needsCurrent(member, player))) return refuse("requester_only");
	await player.setVolume(volume);
	player.customVolume = volume;
	return { ok: true };
}
