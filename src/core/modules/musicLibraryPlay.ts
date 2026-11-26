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

/**
 * Plays tracks kept in a music library (a playlist, the liked tracks) like
 * /music play does with a playlist. Shared by the dashboard's
 * music.playlist-play / music.favorites-play / music.track-queue and by
 * /music playlist.
 */

import type {
	BaseGuildTextChannel,
	Client,
	Guild,
	GuildMember
} from "discord.js";

import type { DatabaseStructure } from "../../../types/database_structure.js";
import type { LanguageData } from "../../../types/languageData.js";
import {
	announceMusicPlay,
	enqueueMusicQueries,
	type MusicPlayRefusal,
	recordMusicPlay
} from "../functions/musicPlay.js";
import logger from "../logger.js";
import { canPostIn } from "./gatewayLinkActions/music.js";
import { MAX_PLAYLIST_TRACKS } from "./musicLibrary.js";

type LibraryTrack = DatabaseStructure.LibraryTrack;

export type LibraryPlayResult =
	| { ok: true; queued: number }
	| { ok: false; reason: MusicPlayRefusal | "empty" };

export async function playLibraryTracks({
	client,
	lang,
	guild,
	member,
	name,
	tracks,
	single = false,
	shuffle = false,
	fallbackChannelId = null
}: {
	client: Client;
	lang: LanguageData;
	guild: Guild;
	member: GuildMember;
	name: string;
	tracks: LibraryTrack[];
	/** One track, announced as a track, not a playlist. */
	single?: boolean;
	shuffle?: boolean;
	/** Where the panel goes when no player exists (else the voice channel). */
	fallbackChannelId?: string | null;
}): Promise<LibraryPlayResult> {
	if (!tracks.length) return { ok: false, reason: "empty" };
	if (shuffle) {
		tracks = [...tracks];
		for (let i = tracks.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[tracks[i], tracks[j]] = [tracks[j]!, tracks[i]!];
		}
	}
	const voice = member.voice.channel;
	if (!voice) return { ok: false, reason: "not_in_voice" };
	const existing = client.player.getPlayer(guild.id);
	const panelId = existing?.textChannelId ?? fallbackChannelId ?? voice.id;
	const panelChannel = guild.channels.cache.get(panelId);
	const canPost = canPostIn(panelChannel, member);
	const result = await enqueueMusicQueries({
		client,
		lang,
		guild,
		member,
		requester: member.user,
		queries: [],
		results: { name, tracks: tracks.slice(0, MAX_PLAYLIST_TRACKS), single },
		textChannelId: panelId,
		sourceChannelId: canPost ? panelId : null
	});
	if (!result.ok) return result;
	const after =
		canPost && panelChannel && !existing?.queue.current
			? announceMusicPlay({
					client,
					lang,
					player: result.player,
					firstResult: result.firstResult,
					requester: member.user,
					send: (payload) =>
						(panelChannel as BaseGuildTextChannel).send(payload)
				})
			: recordMusicPlay(client, result.player, result.firstResult);
	after.catch((error) => logger.err(error));
	return { ok: true, queued: result.firstResult.tracks.length };
}
