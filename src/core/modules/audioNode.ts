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
 * The audio node (Wavyzon / Lavalink) going away and coming back.
 *
 * When the node restarts, lavalink-client keeps the players (queue, track,
 * position, voice data) and only marks them as not playing; the node, though,
 * starts on a new session that knows none of them. Without help the players
 * stay stale: every control fails ("nothing is playing", REST errors) until
 * someone stops and plays again. Here:
 *
 * - `audioAvailable` says whether a node can take a request (connected, with a
 *   session). The music controls, /music play and the dashboard refuse with a
 *   clear "the music server is restarting" instead of an error meanwhile.
 * - Session resuming is on (RESUME_SECONDS): a node that drops the link or
 *   restarts cleanly (Wavyzon saves resuming sessions on shutdown) keeps its
 *   players, and the bot takes the same session back (`Session-Id`): the
 *   music never stops. The bot turns it off when it shuts down itself, so a
 *   node does not keep playing for nobody.
 * - When a node is back on a NEW session, every player that was on it is put
 *   back on it like `Player.changeNode` does: voice data, track at its last
 *   position, volume, pause, filters, APO, next track (crossfade). A player
 *   that cannot be restored is destroyed cleanly (it would only fail later).
 * - `destroyPlayerSafely`: /music stop while the node is down still leaves the
 *   voice channel and empties the queue (lavalink-client throws on the last
 *   step, the node's DELETE, and never emits `playerDestroy`).
 */

import { Client } from "discord.js";
import type { LavalinkNode, Player } from "lavalink-client";

import logger from "../logger.js";
import { applyGuildApo } from "./musicApo.js";
import { resyncNextTrack } from "./nextTrackSync.js";
import { getTTSData } from "./ttsManager.js";

// node id -> when it went down, and the session it had then.
const down = new Map<string, { since: number; session: string | null }>();
// Nodes whose players are being put back.
const restoring = new Set<string>();

const usable = (node: LavalinkNode | undefined): boolean =>
	!!node?.connected &&
	!!node.sessionId &&
	!down.has(node.id) &&
	!restoring.has(node.id);

/** A node can take a request now. */
export function audioAvailable(client: Client): boolean {
	const nodes = client.player?.nodeManager?.nodes;
	if (!nodes) return false;
	for (const node of nodes.values()) if (usable(node)) return true;
	return false;
}

/** Since when no node can take a request (ms), or null when one can. */
export function audioDownSince(client: Client): number | null {
	if (audioAvailable(client)) return null;
	const times = [...down.values()].map((d) => d.since);
	return times.length ? Math.min(...times) : Date.now();
}

/** The player's node can take a request. */
export function playerNodeReady(player: Player): boolean {
	return usable(player.node);
}

/** Destroys a player even when its node is gone (see above). */
export async function destroyPlayerSafely(
	player: Player,
	reason = "stop"
): Promise<void> {
	if (player.node.connected && player.node.sessionId) {
		await player.destroy(reason);
		return;
	}
	try {
		await player.destroy(reason);
	} catch {
		// Voice left and queue emptied: only the node's side failed. The
		// usual clean-up (panels, 24/7, scrobbler) listens to this event.
		if (!player.LavalinkManager.getPlayer(player.guildId)) {
			player.LavalinkManager.emit("playerDestroy", player, reason);
		}
	}
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// How long the node keeps the players of a session that lost its link.
const RESUME_SECONDS = 30;

// Nodes that just took their session back, with the guilds they still play.
const resumed = new Map<string, Set<string>>();

/**
 * After `connect`: the node took the session back (`resumed`, its `ready`
 * says so), or gave a new one (`new`), or dropped the link again (null).
 */
async function settle(
	node: LavalinkNode,
	old: string | null
): Promise<"new" | "resumed" | null> {
	for (let i = 0; i < 75; i++) {
		if (resumed.has(node.id)) return "resumed";
		// lavalink-client puts the session it asks back in `sessionId` before
		// `ready`: a different one is a new session.
		if (node.connected && node.sessionId && node.sessionId !== old)
			return "new";
		if (!node.connected) return null;
		await wait(200);
	}
	return null;
}

// A new session: resuming on, and its id asked back on the next connection.
async function armResume(node: LavalinkNode): Promise<void> {
	try {
		await node.updateSession(true, RESUME_SECONDS);
		node.options.sessionId = node.sessionId ?? undefined;
	} catch (error) {
		logger.warn(
			`audio node ${node.id}: session resuming not enabled (${(error as Error).message})`
		);
	}
}

// The bot stopping: the node must not keep its players for nobody. Best
// effort (the request leaves before the shard exits, slashCommandLogger
// holds SIGTERM up to 3 s); RESUME_SECONDS bounds the rest.
let exitHooked = false;
function endResumingOnExit(client: Client): void {
	if (exitHooked) return;
	exitHooked = true;
	const end = () => {
		for (const node of client.player?.nodeManager?.nodes.values() ?? []) {
			if (!node.connected || !node.sessionId) continue;
			node.options.sessionId = undefined;
			void node.updateSession(false).catch(() => null);
		}
	};
	process.prependListener("SIGTERM", end);
	process.prependListener("SIGINT", end);
}

async function restorePlayer(
	client: Client,
	node: LavalinkNode,
	player: Player
): Promise<boolean> {
	const voice = player.voice;
	if (!voice?.token || !voice.endpoint || !voice.sessionId) {
		// No voice data to hand over: nothing can play again on its own.
		await destroyPlayerSafely(player, "AudioNodeRestartedNoVoice");
		return false;
	}
	// A text-to-speech session would read an old sentence again.
	const tts = await getTTSData(client, player.guildId).catch(() => null);
	const current = tts?.enabled ? null : player.queue.current;
	player.node = node;
	await node.updatePlayer({
		guildId: player.guildId,
		noReplace: false,
		playerOptions: {
			...(current?.encoded && {
				track: {
					encoded: current.encoded,
					userData: current.userData ?? {}
				},
				position: Math.max(0, Math.floor(player.lastPosition || 0)),
				volume: player.lavalinkVolume,
				paused: !!player.paused
			}),
			voice: {
				token: voice.token,
				endpoint: voice.endpoint,
				sessionId: voice.sessionId,
				channelId: voice.channelId
			}
		}
	});
	if (current) {
		await player.filterManager.applyPlayerFilters().catch(() => null);
		await applyGuildApo(player).catch(() => null);
		await resyncNextTrack(player).catch(() => null);
	}
	return true;
}

async function restorePlayers(
	client: Client,
	node: LavalinkNode,
	// Guilds the node still plays (a resumed session): nothing to put back.
	kept: Set<string> = new Set()
): Promise<void> {
	const players = [...client.player.players.values()].filter(
		(p) =>
			(p.node.id === node.id || !p.node.connected) && !kept.has(p.guildId)
	);
	let ok = 0;
	let failed = 0;
	for (const player of players) {
		try {
			if (await restorePlayer(client, node, player)) ok++;
			else failed++;
		} catch (error) {
			failed++;
			logger.warn(
				`audio node ${node.id}: player ${player.guildId} not restored (${(error as Error).message})`
			);
			await destroyPlayerSafely(player, "AudioNodeRestartFailed").catch(
				() => null
			);
		}
	}
	if (players.length)
		logger.log(
			`audio node ${node.id}: ${ok} player(s) restored, ${failed} stopped`
		);
}

/** Listens to the node manager (playerManager.ts, once). */
export function watchAudioNodes(client: Client): void {
	client.player.nodeManager
		.on("disconnect", (node, reason) => {
			if (down.has(node.id)) return;
			down.set(node.id, {
				since: Date.now(),
				session: node.sessionId ?? null
			});
			logger.warn(
				`audio node ${node.id} lost (${reason?.code ?? "?"} ${reason?.reason ?? ""}): players kept until it is back`
			);
		})
		.on("error", (node, error) => {
			// One line per outage, not one per reconnection attempt (a node
			// down when the bot starts never says "disconnect").
			if (down.has(node.id)) return;
			if (!node.connected) {
				down.set(node.id, {
					since: Date.now(),
					session: node.sessionId ?? null
				});
			}
			logger.err(`audio node ${node.id}: ${error.message}`);
		})
		.on("resumed", (node, _payload, players) => {
			// The node kept the session: its players are what really plays.
			const list = Array.isArray(players) ? players : [];
			const kept = new Set<string>();
			for (const remote of list) {
				const player = client.player.getPlayer(remote.guildId);
				if (!player || !remote.track) continue;
				kept.add(remote.guildId);
				player.paused = !!remote.paused;
				player.playing = !remote.paused;
				player.lastPosition =
					remote.state?.position ?? player.lastPosition;
				player.lastPositionChange = Date.now();
			}
			resumed.set(node.id, kept);
		})
		.on("connect", (node) => {
			const was = down.get(node.id);
			restoring.add(node.id);
			void (async () => {
				try {
					const how = await settle(node, was?.session ?? null);
					if (!how) return;
					const kept = resumed.get(node.id) ?? new Set<string>();
					resumed.delete(node.id);
					down.delete(node.id);
					if (how === "new") await armResume(node);
					// The first connection (bot start): nothing to put back.
					if (!was) return;
					logger.log(
						`audio node ${node.id} is back after ${Math.round((Date.now() - was.since) / 1000)}s (${how === "resumed" ? `session resumed, ${kept.size} player(s) kept` : "new session"})`
					);
					await restorePlayers(client, node, kept);
				} finally {
					restoring.delete(node.id);
				}
			})();
		});
	endResumingOnExit(client);
}

/** Tests only. */
export const __audioNodeTest = { down, restoring, resumed };
