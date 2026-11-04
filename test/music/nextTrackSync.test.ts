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

import { expect, test } from "bun:test";

import {
	nextTrackQueueWatcher,
	resyncNextTrack,
	syncNextTrack
} from "../../src/core/modules/nextTrackSync.ts";

type Sent = {
	guildId: string;
	playerOptions: { nextTrack: { encoded: string | null } };
};

/** A player on a fake node that records every update. */
function fakePlayer(opts: {
	wavyzon?: boolean;
	tracks?: string[];
	current?: string | null;
	repeat?: string;
}) {
	const sent: (string | null)[] = [];
	const data = new Map<string, unknown>();
	const player = {
		guildId: "1",
		repeatMode: opts.repeat ?? "off",
		queue: {
			current:
				opts.current === null ? null : { encoded: opts.current ?? "A" },
			tracks: (opts.tracks ?? []).map((encoded) => ({ encoded }))
		},
		node: {
			sessionId: "s",
			info:
				opts.wavyzon === false ? { version: {} } : { wavyzon: "0.1.0" },
			updatePlayer: async (d: Sent) => {
				sent.push(d.playerOptions.nextTrack.encoded);
			}
		},
		getData: (k: string) => data.get(k),
		setData: (k: string, v: unknown) => data.set(k, v)
	};
	return { player: player as any, sent };
}

test("sends the head of the queue once", async () => {
	const { player, sent } = fakePlayer({ tracks: ["B", "C"] });
	await syncNextTrack(player);
	await syncNextTrack(player);
	expect(sent).toEqual(["B"]);
});

test("follows queue changes and clears when the queue empties", async () => {
	const { player, sent } = fakePlayer({ tracks: ["B"] });
	await syncNextTrack(player);
	player.queue.tracks = [{ encoded: "C" }, { encoded: "B" }];
	await syncNextTrack(player);
	player.queue.tracks = [];
	await syncNextTrack(player);
	expect(sent).toEqual(["B", "C", null]);
});

test("repeat modes pick the current track", async () => {
	const looping = fakePlayer({ tracks: ["B"], repeat: "track" });
	await syncNextTrack(looping.player);
	expect(looping.sent).toEqual(["A"]);
	const alone = fakePlayer({ tracks: [], repeat: "queue" });
	await syncNextTrack(alone.player);
	expect(alone.sent).toEqual(["A"]);
});

test("nothing is sent when there is nothing next, or to a plain Lavalink", async () => {
	const empty = fakePlayer({ tracks: [] });
	await syncNextTrack(empty.player);
	expect(empty.sent).toEqual([]);
	const lavalink = fakePlayer({ wavyzon: false, tracks: ["B"] });
	await syncNextTrack(lavalink.player);
	expect(lavalink.sent).toEqual([]);
});

test("a track start sends the next track again", async () => {
	const { player, sent } = fakePlayer({ tracks: ["B"] });
	await syncNextTrack(player);
	await resyncNextTrack(player);
	expect(sent).toEqual(["B", "B"]);
});

test("a failed update is retried on the next sync", async () => {
	const { player, sent } = fakePlayer({ tracks: ["B"] });
	let fail = true;
	const record = player.node.updatePlayer;
	player.node.updatePlayer = async (d: Sent) => {
		if (fail) throw new Error("down");
		return record(d);
	};
	await syncNextTrack(player);
	fail = false;
	await syncNextTrack(player);
	expect(sent).toEqual(["B"]);
});

test("the queue watcher syncs the guild's player", async () => {
	const { player, sent } = fakePlayer({ tracks: ["B"] });
	const watcher = nextTrackQueueWatcher({
		player: { getPlayer: () => player }
	} as any);
	watcher.tracksAdd("1", [], 0, {} as any, {} as any);
	await new Promise((r) => setTimeout(r, 0));
	expect(sent).toEqual(["B"]);
});

test("lavalink-client accepts the queue watcher", async () => {
	const { LavalinkManager } = await import("lavalink-client");
	const build = () =>
		new LavalinkManager({
			nodes: [
				{ id: "n", host: "127.0.0.1", port: 1, authorization: "x" }
			],
			sendToShard: () => {},
			client: { id: "1" },
			queueOptions: {
				queueChangesWatcher: nextTrackQueueWatcher({} as any)
			}
		});
	expect(build).not.toThrow();
});
