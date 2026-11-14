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
 * Where the track playing is, for what shows it (dashboard, now playing
 * card). lavalink-client only learns the position from the node's
 * `playerUpdate` (every few seconds): right after a track changes (skip,
 * crossfade, end of track) `player.position` is still the OLD track's, and it
 * keeps growing while paused. The start of each track is noted here (the
 * `trackStart` event, and the crossfade skip, which changes the track before
 * the node says so); until the node reports a position for it, the time since
 * that start is the position.
 */

import type { Player, Track, UnresolvedTrack } from "lavalink-client";

const KEY = "internal_track_clock";
// A crossfade notes the start before the node's own trackStart: kept.
const SAME_START_MS = 30_000;

// `hold`: until then the node's position is not this track's. A Wavyzon
// crossfade keeps reporting the OUTGOING deck's position for the whole fade
// (wavyzon-player player.rs: FrameInfo.position_ms = pos_a while mixing).
// `pausedAt`: the time since the start stops there while paused (the lyrics
// and the progress stay still); a resume moves `at` (and `hold`) on by the
// pause's length.
type Clock = { id: string; at: number; hold?: number; pausedAt?: number };

const idOf = (track: Track | UnresolvedTrack | null | undefined) =>
	track?.encoded ?? track?.info?.identifier ?? null;

/** The current track (or `track`) starts now. */
export function markTrackStart(
	player: Player,
	track: Track | UnresolvedTrack | null = player.queue.current,
	at = Date.now(),
	// The node keeps reporting the previous track this long (crossfade).
	holdMs = 0
): void {
	const id = idOf(track);
	if (!id) return;
	const prev = player.getData<Clock | undefined>(KEY);
	if (prev?.id === id && at - prev.at < SAME_START_MS) return;
	player.setData(KEY, { id, at, ...(holdMs > 0 && { hold: at + holdMs }) });
}

/** The player was paused (or resumed) at `at`: see `Clock.pausedAt`. */
export function markPaused(
	player: Player,
	paused: boolean,
	at = Date.now()
): void {
	const clock = player.getData<Clock | undefined>(KEY);
	if (!clock) return;
	if (paused && clock.pausedAt === undefined) {
		player.setData(KEY, { ...clock, pausedAt: at });
	} else if (!paused && clock.pausedAt !== undefined) {
		const shift = Math.max(0, at - clock.pausedAt);
		player.setData(KEY, {
			id: clock.id,
			at: clock.at + shift,
			...(clock.hold !== undefined && { hold: clock.hold + shift })
		});
	}
}

/** The position of the track playing (ms), bounded by its duration. */
export function trackPosition(player: Player): number {
	const current = player.queue.current;
	if (!current) return 0;
	const duration =
		current.info?.isStream || !current.info?.duration
			? Number.POSITIVE_INFINITY
			: current.info.duration;
	// A pause or a resume nobody noted (markPaused) counts from when it is seen.
	const noted = player.getData<Clock | undefined>(KEY);
	if (noted && !!player.paused !== (noted.pausedAt !== undefined))
		markPaused(player, !!player.paused);
	const clock = player.getData<Clock | undefined>(KEY);
	const reported = player.lastPositionChange ?? 0;
	let position: number;
	if (
		clock &&
		clock.id === idOf(current) &&
		(reported < clock.at || Date.now() < (clock.hold ?? 0))
	) {
		// No position from the node for this track yet: the time since its
		// start, stopped while paused.
		position = (clock.pausedAt ?? Date.now()) - clock.at;
	} else {
		// lavalink-client's position grows while paused: not the real one.
		position = player.paused ? player.lastPosition : player.position;
	}
	return Math.max(0, Math.min(position, duration));
}
