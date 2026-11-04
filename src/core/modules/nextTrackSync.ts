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
 * Keeps the Wavyzon node's `nextTrack` equal to what the queue plays next,
 * so the node crossfades into it before the current track ends
 * (WAVYZON_CROSSFADE_MS, 3 s by default) instead of waiting for our `play`
 * after the end.
 *
 * - The node still reports `TrackEndEvent{finished}`; lavalink-client then
 *   plays the head of the queue as usual and the node adopts the track that
 *   is already playing (no restart).
 * - What plays next: the current track on "repeat track", the head of the
 *   queue, or the current track again when it is alone on "repeat queue".
 * - Synced on every track start (the node forgets `nextTrack` on each new
 *   track), on every queue change, and on `playerUpdate` as a safety net
 *   (repeat mode changes); the last value sent is remembered so nothing is
 *   sent twice.
 * - Only on a Wavyzon node (`wavyzon` in /v4/info): a plain Lavalink never
 *   receives the field.
 */

import { Client } from "discord.js";
import { LavalinkNode, QueueChangesWatcher } from "lavalink-client";

type Player = NonNullable<ReturnType<Client["player"]["getPlayer"]>>;

/** Player data key: the encoded track last sent as `nextTrack`. */
const SENT = "internal_wavyzon_next_track";

function isWavyzonNode(node?: LavalinkNode | null): boolean {
	return !!(node?.info as { wavyzon?: string } | null | undefined)?.wavyzon;
}

/** The encoded track the queue plays after the current one, if any. */
function upcoming(player: Player): string | null {
	const current = player.queue.current;
	if (!current) return null;
	if (player.repeatMode === "track") return current.encoded ?? null;
	const head = player.queue.tracks[0];
	if (head) return head.encoded ?? null;
	if (player.repeatMode === "queue") return current.encoded ?? null;
	return null;
}

/** Sends `nextTrack` when what plays next changed. */
export async function syncNextTrack(player: Player | undefined): Promise<void> {
	if (!player || !isWavyzonNode(player.node) || !player.node.sessionId)
		return;
	const next = upcoming(player);
	const sent = player.getData<string | null | undefined>(SENT);
	if (sent === next || (sent === undefined && next === null)) return;
	player.setData(SENT, next);
	try {
		await player.node.updatePlayer({
			guildId: player.guildId,
			// Wavyzon field, absent from lavalink-client's typings.
			playerOptions: { nextTrack: { encoded: next } } as never
		});
	} catch (error) {
		player.setData(SENT, undefined);
		logger.warn(
			`nextTrack sync failed (${player.guildId}): ${String(error)}`
		);
	}
}

/** The node dropped its `nextTrack` (a new track started): send it again. */
export async function resyncNextTrack(player: Player): Promise<void> {
	player.setData(SENT, undefined);
	await syncNextTrack(player);
}

/** lavalink-client queue watcher that syncs after every queue change. */
export function nextTrackQueueWatcher(client: Client): QueueChangesWatcher {
	const sync = (guildId: string) =>
		void syncNextTrack(client.player?.getPlayer(guildId));
	return {
		tracksAdd: (guildId) => sync(guildId),
		tracksRemoved: (guildId) => sync(guildId),
		shuffled: (guildId) => sync(guildId)
	};
}
