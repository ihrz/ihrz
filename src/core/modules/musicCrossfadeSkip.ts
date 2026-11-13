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
 * Skips that crossfade on a Wavyzon node, driven from the bot with the node's
 * public mix API: `mix/deckb` loads the track, `mix/crossfade` fades into it.
 *
 * - lavalink-client's skip() stops the player then plays the next track: a
 *   hard cut. It stays the fallback for everything below.
 * - The node ends the old track with `replaced` when the fade completes, and
 *   lavalink-client doesn't advance its queue on `replaced`: the queue is
 *   advanced here, as soon as the fade starts.
 * - Not near the end of a track: the node's automatic crossfade may start
 *   meanwhile, and its `finished` would advance the queue a second time.
 */

import { markTrackStart } from "./trackClock.js";
import { Track } from "lavalink-client";

import { isWavyzonNode, syncNextTrack } from "./nextTrackSync.js";

type Player = NonNullable<
	ReturnType<import("discord.js").Client["player"]["getPlayer"]>
>;

export const SKIP_CROSSFADE_MS = 3_000;
// Longest wait for the node: the callers answer a Discord interaction (3 s).
const NODE_TIMEOUT_MS = 2_500;
// WAVYZON_CROSSFADE_MS at its default (3 s) plus the load time.
const NEAR_END_MS = 6_000;
/** Player data key: a crossfaded skip is being set up. */
const BUSY = "internal_crossfade_skip";

/** The fields of the node's player state used here. */
export interface NodeMixState {
	paused?: boolean;
	mixing?: boolean;
	mixArmedAtMs?: number | null;
	positionMs?: number;
}

/** Whether the skip can fade: nothing else is mixing and the end is not near. */
export function canCrossfade(
	state: NodeMixState,
	track: { isStream?: boolean; duration?: number } | null | undefined
): boolean {
	if (!track || state.paused || state.mixing) return false;
	if (state.mixArmedAtMs !== undefined && state.mixArmedAtMs !== null)
		return false;
	if (track.isStream || !track.duration) return true;
	return track.duration - (state.positionMs ?? 0) > NEAR_END_MS;
}

async function nodeCall(
	player: Player,
	method: "GET" | "POST",
	path: string,
	body?: unknown
): Promise<unknown> {
	const { secure, host, port, authorization } = player.node.options;
	const base = `http${secure ? "s" : ""}://${host}:${port}/v1/sessions/${player.node.sessionId}/players/${player.guildId}`;
	const res = await fetch(`${base}${path}`, {
		method,
		headers: {
			Authorization: authorization,
			"Content-Type": "application/json"
		},
		body: body === undefined ? undefined : JSON.stringify(body),
		signal: AbortSignal.timeout(NODE_TIMEOUT_MS)
	});
	if (!res.ok) throw new Error(`${method} ${path}: HTTP ${res.status}`);
	return res.status === 204 ? null : res.json();
}

/** Same steps as lavalink-client's end of track, which it doesn't export. */
async function advanceQueue(player: Player, skipTo: number): Promise<void> {
	const { queue } = player;
	if (skipTo > 1) await queue.splice(0, skipTo - 1);
	const current = queue.current;
	if (current && !current.pluginInfo?.clientData?.previousTrack) {
		queue.previous.unshift(current);
		queue.previous.splice(queue.options.maxPreviousTracks);
	}
	if (player.repeatMode === "queue" && current) queue.tracks.push(current);
	queue.current = (queue.tracks.shift() as Track | undefined) ?? null;
	// Deck B started at 0 with the fade: the node says so a few seconds later.
	markTrackStart(
		player,
		player.queue.current,
		Date.now(),
		SKIP_CROSSFADE_MS + 500
	);
	await queue.utils.save();
}

async function startCrossfade(
	player: Player,
	skipTo: number
): Promise<boolean> {
	if (!isWavyzonNode(player.node) || !player.node.sessionId) return false;
	const target = player.queue.tracks[Math.max(skipTo, 1) - 1];
	if (!target?.encoded) return false;

	const update = (await nodeCall(player, "GET", "")) as {
		state?: { player?: NodeMixState };
	};
	const state = update.state?.player ?? {};
	if (!canCrossfade(state, player.queue.current?.info)) return false;

	await nodeCall(player, "POST", "/mix/deckb", {
		encodedTrack: target.encoded,
		position: 0
	});
	await nodeCall(player, "POST", "/mix/crossfade", {
		durationMs: SKIP_CROSSFADE_MS,
		curve: "equal_power"
	});
	return true;
}

/**
 * player.skip() with a crossfade when the node can do it. `skipTo` has the
 * same meaning: 2 plays the second track of the queue.
 */
export async function crossfadeSkip(player: Player, skipTo = 0): Promise<void> {
	if (skipTo > player.queue.tracks.length || !player.queue.tracks.length) {
		await player.skip(skipTo);
		return;
	}
	// A second skip while the first is being set up would skip twice.
	if (player.getData(BUSY)) return;
	player.setData(BUSY, true);
	try {
		let faded = false;
		try {
			faded = await startCrossfade(player, skipTo);
		} catch (error) {
			logger.warn(
				`crossfade skip failed (${player.guildId}): ${String(error)}`
			);
		}
		if (!faded) {
			await player.skip(skipTo);
			return;
		}
		await advanceQueue(player, skipTo);
		// The node still holds the old nextTrack, which is now playing.
		await syncNextTrack(player);
	} finally {
		player.setData(BUSY, false);
	}
}
