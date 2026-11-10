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
 * The music player from the dashboard: state, controls, search, play and
 * lyrics. Every control calls the function of its /music command
 * (core/modules/musicControls.ts, functions/musicPlay.ts), with its checks:
 * most controls need the dashboard user in the bot's voice channel, like the
 * command.
 */

import {
	BaseGuildTextChannel,
	Guild,
	GuildBasedChannel,
	GuildMember,
	PermissionFlagsBits
} from "discord.js";

import logger from "../../logger.js";
import {
	announceMusicPlay,
	enqueueMusicQueries,
	isUrlQuery,
	MusicPlayRefusal,
	recordMusicPlay,
	stripChoiceDuration
} from "../../functions/musicPlay.js";
import { searchTrackSuggestions } from "../musicAutocomplete.js";
import { crossfadeSkip } from "../musicCrossfadeSkip.js";
import {
	clearMusicQueue,
	MusicControlResult,
	MusicPlayer,
	MusicRefusal,
	pauseMusic,
	REPEAT_MODES,
	RepeatMode,
	resumeMusic,
	setMusicLoop,
	setMusicVolume,
	shuffleMusic,
	skipMusic,
	stopMusic
} from "../musicControls.js";
import { ActionContext, ActionGroup, fail } from "./types.js";

type Track = NonNullable<MusicPlayer["queue"]["current"]>;

export const QUEUE_MAX = 100;
const SEARCH_MIN = 2;
const SEARCH_MAX = 100;
const PLAY_QUERY_MAX = 500;
const LYRICS_MAX = 20_000;
// /music volume offers 10 to 100.
export const VOLUME_MIN = 10;
export const VOLUME_MAX = 100;

export interface MusicTrackView {
	title: string;
	author: string;
	uri: string | null;
	artworkUrl: string | null;
	// ms, 0 for a live stream
	duration: number;
	isStream: boolean;
	source: string | null;
	identifier: string;
	requesterId: string | null;
}

export interface MusicStateView {
	active: boolean;
	connected: boolean;
	voiceChannel: { id: string; name: string } | null;
	textChannel: { id: string; name: string } | null;
	playing: boolean;
	paused: boolean;
	volume: number;
	loop: RepeatMode;
	position: number;
	current: MusicTrackView | null;
	queue: MusicTrackView[];
	queueLength: number;
	// ms of the upcoming tracks, live streams excluded
	queueDuration: number;
	actor: { voiceChannelId: string | null; inBotChannel: boolean };
}

const isLive = (track: Track): boolean =>
	!!track.info.isStream || !track.info.duration;

export function trackView(track: Track): MusicTrackView {
	const requester = track.requester as { id?: unknown } | null | undefined;
	return {
		title: track.info.title || "",
		author: track.info.author || "",
		uri: track.info.uri || null,
		artworkUrl: track.info.artworkUrl || null,
		duration: isLive(track) ? 0 : track.info.duration,
		isStream: isLive(track),
		source: track.info.sourceName || null,
		identifier: track.info.identifier,
		requesterId:
			typeof requester?.id === "string" ? (requester.id as string) : null
	};
}

const channelRef = (guild: Guild, id: string | null | undefined) => {
	const channel = id ? guild.channels.cache.get(id) : undefined;
	return channel ? { id: channel.id, name: channel.name } : null;
};

// What the dashboard shows; read from memory only (polled every ~10 s).
export function musicState(
	guild: Guild,
	actor: GuildMember,
	player: MusicPlayer | undefined
): MusicStateView {
	const actorVoice = actor.voice.channelId ?? null;
	if (!player) {
		return {
			active: false,
			connected: false,
			voiceChannel: null,
			textChannel: null,
			playing: false,
			paused: false,
			volume: 0,
			loop: "off",
			position: 0,
			current: null,
			queue: [],
			queueLength: 0,
			queueDuration: 0,
			actor: { voiceChannelId: actorVoice, inBotChannel: false }
		};
	}
	const current = (player.queue.current as Track | null) ?? null;
	const tracks = player.queue.tracks as Track[];
	return {
		active: !!current,
		connected: !!player.connected,
		voiceChannel: channelRef(guild, player.voiceChannelId),
		textChannel: channelRef(guild, player.textChannelId),
		playing: !!player.playing,
		paused: !!player.paused,
		volume: player.volume,
		loop: (REPEAT_MODES as readonly string[]).includes(player.repeatMode)
			? (player.repeatMode as RepeatMode)
			: "off",
		position:
			current && !isLive(current)
				? Math.max(0, Math.min(player.position, current.info.duration))
				: 0,
		current: current ? trackView(current) : null,
		queue: tracks.slice(0, QUEUE_MAX).map(trackView),
		queueLength: tracks.length,
		queueDuration: tracks.reduce(
			(sum, t) => sum + (isLive(t) ? 0 : t.info.duration || 0),
			0
		),
		actor: {
			voiceChannelId: actorVoice,
			inBotChannel: !!actorVoice && actorVoice === player.voiceChannelId
		}
	};
}

export const CONTROL_ERRORS: Record<MusicRefusal, string> = {
	not_in_voice: "you must be in a voice channel",
	nothing_playing: "nothing is playing",
	not_same_channel: "forbidden: you must be in the bot's voice channel",
	not_enough_tracks: "at least 2 tracks must be queued to shuffle"
};

export const PLAY_ERRORS: Record<MusicPlayRefusal, string> = {
	not_in_voice: "you must be in a voice channel to play music",
	h247_refused: "forbidden: 24/7 mode keeps the bot in another voice channel",
	music_cannot: "forbidden: the bot is playing in another voice channel",
	not_allowed: "this link is not allowed",
	no_result: "no track found"
};

const stateOf = ({ client, guild, actor }: ActionContext) =>
	musicState(guild, actor, client.player.getPlayer(guild.id));

// Runs a control and answers with the new state.
async function control<T extends object>(
	ctx: ActionContext,
	run: () => Promise<MusicControlResult<T>>
) {
	const result = await run();
	if (!result.ok) return fail(CONTROL_ERRORS[result.reason]);
	const { ok: _ok, ...extra } = result;
	return { ...extra, state: stateOf(ctx) };
}

// The member and the bot can read and post in this channel.
export function canPostIn(
	channel: GuildBasedChannel | undefined,
	member: GuildMember
): channel is GuildBasedChannel & BaseGuildTextChannel {
	if (!channel?.isTextBased()) return false;
	const need = [
		PermissionFlagsBits.ViewChannel,
		PermissionFlagsBits.SendMessages
	];
	const me = member.guild.members.me;
	return (
		!!channel.permissionsFor(member)?.has(need) &&
		!!me &&
		!!channel.permissionsFor(me)?.has(need)
	);
}

export const musicActions: ActionGroup = {
	"music.state": {
		read: true,
		command: "music queue",
		run: async (ctx) => stateOf(ctx)
	},

	"music.pause": {
		command: "music pause",
		run: async (ctx) =>
			control(ctx, () => pauseMusic(ctx.client, ctx.actor))
	},

	"music.resume": {
		command: "music resume",
		run: async (ctx) =>
			control(ctx, () => resumeMusic(ctx.client, ctx.actor))
	},

	"music.skip": {
		command: "music skip",
		run: async (ctx) =>
			control(ctx, () => skipMusic(ctx.client, ctx.actor, ctx.lang, null))
	},

	"music.stop": {
		command: "music stop",
		run: async (ctx) => control(ctx, () => stopMusic(ctx.client, ctx.actor))
	},

	"music.shuffle": {
		command: "music shuffle",
		run: async (ctx) =>
			control(ctx, () => shuffleMusic(ctx.client, ctx.actor))
	},

	"music.clear": {
		command: "music clear-queue",
		run: async (ctx) =>
			control(ctx, () => clearMusicQueue(ctx.client, ctx.actor))
	},

	"music.loop": {
		command: "music loop",
		run: async (ctx) => {
			const mode = ctx.params.oneOf("mode", REPEAT_MODES);
			return control(ctx, () =>
				setMusicLoop(ctx.client, ctx.actor, mode)
			);
		}
	},

	"music.volume": {
		command: "music volume",
		run: async (ctx) => {
			const value = ctx.params.int("value", {
				min: VOLUME_MIN,
				max: VOLUME_MAX
			});
			return control(ctx, () =>
				setMusicVolume(ctx.client, ctx.actor, value)
			);
		}
	},

	// The "jump to" menu of the /music queue panel.
	"music.skip-to": {
		command: "music queue",
		run: async (ctx) => {
			const { client, guild, actor, params, lang } = ctx;
			const index = params.int("index", { min: 0 });
			const identifier = params.optStr("identifier", 500);
			const player = client.player.getPlayer(guild.id);
			if (!player?.queue.current) return fail("nothing is playing");
			if (
				!actor.voice.channelId ||
				actor.voice.channelId !== player.voiceChannelId
			) {
				return fail(CONTROL_ERRORS.not_same_channel);
			}
			const target = player.queue.tracks[index] as Track | undefined;
			if (!target) return fail("track not found");
			if (identifier !== null && target.info.identifier !== identifier) {
				return fail("the queue changed, refresh it and try again");
			}
			await crossfadeSkip(player, index + 1);
			const channel = guild.channels.cache.get(
				player.textChannelId as string
			) as BaseGuildTextChannel | undefined;
			channel
				?.send({
					content: lang.queue_jumped
						.replace("${author}", actor.toString())
						.replace(
							"${track}",
							`**${(target.info.title || "?").slice(0, 70)}**`
						),
					allowedMentions: { parse: [] }
				})
				.catch(() => null);
			return { skippedTo: trackView(target), state: stateOf(ctx) };
		}
	},

	// The suggestions of /music play: pass `value` to music.play.
	"music.search": {
		read: true,
		command: "music play",
		run: async ({ client, actor, params }) => {
			const query = stripChoiceDuration(
				params.str("query", { max: SEARCH_MAX }).trim()
			);
			if (isUrlQuery(query)) return { url: true, results: [] };
			if (query.length < SEARCH_MIN)
				return fail(`query must be at least ${SEARCH_MIN} characters`);
			const found = await searchTrackSuggestions(
				client,
				actor.user,
				query
			);
			return {
				url: false,
				results: found.map(({ track, choice }) => ({
					...trackView(track),
					value: choice.value
				}))
			};
		}
	},

	// /music play. The now playing panel goes to `channelId`, or else the
	// player's text channel (the voice channel's chat for a new player),
	// when the dashboard user can post there.
	"music.play": {
		command: "music play",
		run: async (ctx) => {
			const { client, guild, actor, params, lang } = ctx;
			const query = params.str("query", { max: PLAY_QUERY_MAX });
			const requestedId = params.optId("channelId");
			const voice = actor.voice.channel;
			if (!voice) return fail(PLAY_ERRORS.not_in_voice);

			const existing = client.player.getPlayer(guild.id);
			const panelId = requestedId ?? existing?.textChannelId ?? voice.id;
			const panelChannel = guild.channels.cache.get(panelId);
			const canPost = canPostIn(panelChannel, actor);
			if (requestedId) {
				if (!panelChannel) return fail("channel not found");
				if (!canPost) {
					return fail(
						"forbidden: you can't send messages in this channel"
					);
				}
			}

			const result = await enqueueMusicQueries({
				client,
				lang,
				guild,
				member: actor,
				requester: actor.user,
				queries: [query],
				textChannelId: panelId,
				sourceChannelId: canPost ? panelId : null
			});
			if (!result.ok) return fail(PLAY_ERRORS[result.reason]);

			const { player, firstResult } = result;
			const first = firstResult.tracks[0] as Track;
			const after =
				canPost && panelChannel
					? announceMusicPlay({
							client,
							lang,
							player,
							firstResult,
							requester: actor.user,
							send: (payload) =>
								(panelChannel as BaseGuildTextChannel).send(
									payload
								)
						})
					: recordMusicPlay(client, player, firstResult);
			// The panel renders a card: not waited for.
			after.catch((error) => logger.err(error));

			return {
				track: trackView(first),
				playlist:
					firstResult.loadType === "playlist"
						? {
								name: firstResult.playlist?.name || null,
								count: firstResult.tracks.length
							}
						: null,
				panelChannelId: canPost ? panelId : null,
				state: stateOf(ctx)
			};
		}
	},

	// /music lyrics, of `query` or else of the track playing.
	"music.lyrics": {
		read: true,
		command: "music lyrics",
		run: async ({ client, guild, actor, params }) => {
			const query = params.optStr("query", SEARCH_MAX);
			let target: string | Track;
			if (query) {
				target = query;
			} else {
				const current = client.player.getPlayer(guild.id)?.queue
					.current as Track | null | undefined;
				if (!current) return fail("nothing is playing");
				target = current;
			}
			const found = await client.func
				.searchLyrics(target, actor.user)
				.catch(() => null);
			const text = found?.res.text?.trim();
			if (!found?.track || !text) return fail("lyrics not found");
			return {
				track: trackView(found.track as Track),
				provider: found.res.provider,
				text: text.slice(0, LYRICS_MAX),
				truncated: text.length > LYRICS_MAX
			};
		}
	}
};
