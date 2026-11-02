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

import type { Track } from "lavalink-client";

import { DatabaseStructure } from "../../../types/database_structure.js";

// Structured entries kept, newest last (`MUSIC_HISTORY.tracks`).
export const MUSIC_HISTORY_MAX_TRACKS = 1000;

// Records a played track with its artwork for the dashboard history, next
// to the embed/buffer strings used by /history. Never throws.
export async function recordPlayedTrack(
	guildId: string,
	track: Track
): Promise<void> {
	const requester = track.requester as { id?: string } | undefined;
	const entry: DatabaseStructure.MusicHistoryTrack = {
		at: Date.now(),
		requesterId: requester?.id ?? null,
		title: track.info.title,
		author: track.info.author ?? null,
		uri: track.info.uri ?? null,
		artworkUrl: track.info.artworkUrl ?? null,
		duration: track.info.duration ?? null,
		source: track.info.sourceName ?? null
	};
	const path = `${guildId}.MUSIC_HISTORY.tracks`;
	try {
		const stored = (await client.db.get(path)) as
			DatabaseStructure.MusicHistoryTrack[] | null;
		const tracks = Array.isArray(stored) ? stored : [];
		tracks.push(entry);
		await client.db.set(path, tracks.slice(-MUSIC_HISTORY_MAX_TRACKS));
	} catch {
		// History is best effort: never break playback.
	}
}
