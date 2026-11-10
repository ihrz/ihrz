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
 * shuffle, clear-queue, loop, volume), shared with the dashboard
 * (gatewayLinkActions/music.ts). Each function keeps the checks of its
 * command, in the same order: the command maps the refusal to its own
 * message.
 */

import {
	BaseGuildTextChannel,
	Client,
	EmbedBuilder,
	GuildMember
} from "discord.js";

import { LanguageData } from "../../../types/languageData.js";
import { crossfadeSkip } from "./musicCrossfadeSkip.js";
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
	| "not_enough_tracks";

export type MusicControlResult<T = object> =
	({ ok: true } & T) | { ok: false; reason: MusicRefusal };

const refuse = (reason: MusicRefusal) => ({ ok: false, reason }) as const;

const inBotChannel = (member: GuildMember): boolean =>
	member.voice.channelId === member.guild.members.me?.voice.channelId;

const playerOf = (client: Client, member: GuildMember) =>
	client.player.getPlayer(member.guild.id);

// /music pause
export async function pauseMusic(
	client: Client,
	member: GuildMember
): Promise<MusicControlResult<{ paused: boolean }>> {
	if (!member.voice.channel) return refuse("not_in_voice");
	const player = playerOf(client, member);
	if (!player || !player.playing) return refuse("nothing_playing");
	if (!inBotChannel(member)) return refuse("not_same_channel");
	if (!player.paused) await player.pause();
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
	// lavalink-client throws when the player isn't paused.
	if (player.paused) await player.resume();
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
	if (!player || !player.playing) return refuse("nothing_playing");

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
	if (!player || !player.playing || !member.voice.channel)
		return refuse("nothing_playing");
	await player.stopPlaying();
	return { ok: true, tts: false };
}

// /music shuffle
export async function shuffleMusic(
	client: Client,
	member: GuildMember
): Promise<MusicControlResult> {
	const player = playerOf(client, member);
	if (!player || !player.playing || !member.voice.channel)
		return refuse("nothing_playing");
	if (!inBotChannel(member)) return refuse("not_same_channel");
	if (player.queue.tracks.length < 2) return refuse("not_enough_tracks");
	await player.queue.shuffle();
	return { ok: true };
}

// /music clear-queue: removes the upcoming tracks, not the current one.
export async function clearMusicQueue(
	client: Client,
	member: GuildMember
): Promise<MusicControlResult<{ removed: number }>> {
	const player = playerOf(client, member);
	if (!player || !member.voice.channel) return refuse("nothing_playing");
	if (!inBotChannel(member)) return refuse("not_same_channel");
	const removed = player.queue.tracks.length;
	await player.queue.splice(0, removed);
	return { ok: true, removed };
}

// /music loop
export async function setMusicLoop(
	client: Client,
	member: GuildMember,
	mode: RepeatMode
): Promise<MusicControlResult> {
	const player = playerOf(client, member);
	if (!player || !player.playing || !member.voice.channel)
		return refuse("nothing_playing");
	if (!inBotChannel(member)) return refuse("not_same_channel");
	await player.setRepeatMode(mode);
	return { ok: true };
}

// /music volume. Like the command, any member in a voice channel can change
// it (no same channel check).
export async function setMusicVolume(
	client: Client,
	member: GuildMember,
	volume: number
): Promise<MusicControlResult> {
	const player = playerOf(client, member);
	if (!player || !player.playing || !member.voice.channel)
		return refuse("nothing_playing");
	await player.setVolume(volume);
	player.customVolume = volume;
	return { ok: true };
}
