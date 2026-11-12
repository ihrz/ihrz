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

// The audio node restarting (audioNode.ts): clear refusals while it is away,
// players put back on its new session, stop that still works.
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

const apo: string[] = [];
mock.module("../../src/core/modules/musicApo.js", () => ({
	applyGuildApo: async (p: { guildId: string }) => apo.push(p.guildId)
}));
const audio = await import("../../src/core/modules/audioNode.ts");
const controls = await import("../../src/core/modules/musicControls.ts");

const tick = () => new Promise((r) => setTimeout(r, 30));

function makeNode(id = "main") {
	const node: any = {
		id,
		connected: true,
		sessionId: "s1",
		options: {} as { sessionId?: string },
		sessions: [] as any[],
		updateSession: async (resuming: boolean, timeout?: number) => {
			node.sessions.push({ resuming, timeout, session: node.sessionId });
		},
		updates: [] as any[],
		updatePlayer: async (data: any) => {
			node.updates.push(data);
			return {};
		}
	};
	return node;
}

function makePlayer(node: any, over: Record<string, unknown> = {}) {
	const data = new Map<string, unknown>();
	const p: any = {
		guildId: "100000000000000000",
		voiceChannelId: "700000000000000000",
		node,
		playing: false,
		paused: false,
		lastPosition: 61_234,
		lavalinkVolume: 80,
		repeatMode: "off",
		voice: {
			token: "t",
			endpoint: "e",
			sessionId: "v",
			channelId: "700000000000000000"
		},
		queue: {
			current: {
				encoded: "enc-a",
				userData: { x: 1 },
				info: { title: "A" }
			},
			tracks: [{ encoded: "enc-b" }, { encoded: "enc-c" }],
			shuffle: async () => null
		},
		filterManager: { applyPlayerFilters: async () => null },
		getData: (k: string) => data.get(k),
		setData: (k: string, v: unknown) => data.set(k, v),
		destroyed: false,
		destroy: async () => {
			p.destroyed = true;
		},
		...over
	};
	return p;
}

function makeClient(node: any, players: any[]) {
	const nodeManager: any = new EventEmitter();
	nodeManager.nodes = new Map([[node.id, node]]);
	const map = new Map(players.map((p) => [p.guildId, p]));
	const manager: any = new EventEmitter();
	Object.assign(manager, {
		nodeManager,
		players: map,
		getPlayer: (id: string) => map.get(id)
	});
	for (const p of players) p.LavalinkManager = manager;
	return { player: manager } as any;
}

// The module state is shared with the other test files of the run.
const reset = () => {
	audio.__audioNodeTest.down.clear();
	audio.__audioNodeTest.restoring.clear();
	audio.__audioNodeTest.resumed.clear();
	apo.length = 0;
};
// getTTSData (stop) reads the global client's database: an empty one here,
// whatever another test file left there, put back after.
const g = globalThis as { client?: unknown };
let saved: unknown;
beforeEach(() => {
	reset();
	saved = g.client;
	g.client = { db: { get: async () => null } };
});
afterEach(() => {
	reset();
	g.client = saved;
});

describe("audio node restart", () => {
	test("away, then back on a new session: the player is put back", async () => {
		const node = makeNode();
		const player = makePlayer(node, { paused: true });
		const client = makeClient(node, [player]);
		audio.watchAudioNodes(client);
		expect(audio.audioAvailable(client)).toBe(true);
		expect(audio.audioDownSince(client)).toBeNull();

		node.connected = false;
		client.player.nodeManager.emit("disconnect", node, {
			code: 1006,
			reason: ""
		});
		expect(audio.audioAvailable(client)).toBe(false);
		expect(audio.playerNodeReady(player)).toBe(false);
		expect(typeof audio.audioDownSince(client)).toBe("number");

		// Socket open again, but the node has not said `ready` yet: still away.
		node.connected = true;
		client.player.nodeManager.emit("connect", node);
		await tick();
		expect(audio.audioAvailable(client)).toBe(false);
		expect(node.updates).toHaveLength(0);

		node.sessionId = "s2";
		await new Promise((r) => setTimeout(r, 300));
		expect(audio.audioAvailable(client)).toBe(true);
		expect(node.updates).toHaveLength(1);
		const sent = node.updates[0];
		expect(sent.guildId).toBe(player.guildId);
		expect(sent.noReplace).toBe(false);
		expect(sent.playerOptions).toEqual({
			track: { encoded: "enc-a", userData: { x: 1 } },
			position: 61_234,
			volume: 80,
			paused: true,
			voice: {
				token: "t",
				endpoint: "e",
				sessionId: "v",
				channelId: "700000000000000000"
			}
		});
		expect(apo).toEqual([player.guildId]);
		expect(player.destroyed).toBe(false);
		// The new session keeps its players if the link drops again.
		expect(node.sessions).toEqual([
			{ resuming: true, timeout: 30, session: "s2" }
		]);
		expect(node.options.sessionId).toBe("s2");
	});

	test("the node took the session back: nothing is replayed, the state is the node's", async () => {
		const node = makeNode();
		const kept = makePlayer(node, {
			guildId: "100000000000000001",
			playing: true
		});
		const dropped = makePlayer(node, { guildId: "100000000000000002" });
		const client = makeClient(node, [kept, dropped]);
		audio.watchAudioNodes(client);
		node.connected = false;
		client.player.nodeManager.emit("disconnect", node, { code: 1006 });
		kept.playing = false; // what lavalink-client does on close
		node.connected = true;
		client.player.nodeManager.emit("connect", node);
		// Same session id: lavalink-client asked it back.
		client.player.nodeManager.emit(
			"resumed",
			node,
			{ resumed: true, sessionId: "s1", op: "ready" },
			[
				{
					guildId: kept.guildId,
					track: { encoded: "enc-a" },
					paused: false,
					state: { position: 90_000 }
				}
			]
		);
		await new Promise((r) => setTimeout(r, 300));
		expect(audio.audioAvailable(client)).toBe(true);
		expect(kept.playing).toBe(true);
		expect(kept.lastPosition).toBe(90_000);
		// Only the guild the node no longer had is put back.
		expect(node.updates.map((u: any) => u.guildId)).toEqual([
			dropped.guildId
		]);
		// Resuming already on for this session.
		expect(node.sessions).toEqual([]);
	});

	test("a player without voice data is stopped, not left stale", async () => {
		const node = makeNode();
		const player = makePlayer(node, { voice: {} });
		const client = makeClient(node, [player]);
		audio.watchAudioNodes(client);
		node.connected = false;
		client.player.nodeManager.emit("disconnect", node, { code: 1006 });
		node.connected = true;
		node.sessionId = "s2";
		client.player.nodeManager.emit("connect", node);
		await new Promise((r) => setTimeout(r, 300));
		expect(player.destroyed).toBe(true);
		expect(node.updates).toHaveLength(0);
	});

	test("an idle player gets its voice back without a track", async () => {
		const node = makeNode();
		const player = makePlayer(node);
		player.queue.current = null;
		const client = makeClient(node, [player]);
		audio.watchAudioNodes(client);
		node.connected = false;
		client.player.nodeManager.emit("disconnect", node, { code: 1006 });
		node.connected = true;
		node.sessionId = "s2";
		client.player.nodeManager.emit("connect", node);
		await new Promise((r) => setTimeout(r, 300));
		expect(Object.keys(node.updates[0].playerOptions)).toEqual(["voice"]);
	});

	test("a first connection (bot start) restores nothing", async () => {
		const node = makeNode();
		const client = makeClient(node, [makePlayer(node)]);
		audio.watchAudioNodes(client);
		client.player.nodeManager.emit("connect", node);
		await tick();
		expect(node.updates).toHaveLength(0);
		// But its session gets resuming.
		expect(node.sessions).toEqual([
			{ resuming: true, timeout: 30, session: "s1" }
		]);
	});

	test("an error while the node is down counts as away (bot started without it)", () => {
		const node = makeNode();
		node.connected = false;
		node.sessionId = null;
		const client = makeClient(node, []);
		audio.watchAudioNodes(client);
		client.player.nodeManager.emit(
			"error",
			node,
			new Error("ECONNREFUSED")
		);
		expect(audio.__audioNodeTest.down.has("main")).toBe(true);
	});
});

describe("destroyPlayerSafely", () => {
	test("node gone: the node's error is swallowed and playerDestroy still fires", async () => {
		const node = makeNode();
		node.connected = false;
		const player = makePlayer(node);
		const client = makeClient(node, [player]);
		player.destroy = async () => {
			client.player.players.delete(player.guildId);
			throw new Error("The node is not connected");
		};
		let fired = "";
		client.player.on(
			"playerDestroy",
			(_p: unknown, reason: string) => (fired = reason)
		);
		await audio.destroyPlayerSafely(player, "stop");
		expect(fired).toBe("stop");
	});
});

describe("music controls while the node is away", () => {
	const setup = () => {
		const node = makeNode();
		const player = makePlayer(node, {
			playing: false,
			pause: async () => {
				throw new Error("must not reach the node");
			},
			setVolume: async () => {
				throw new Error("must not reach the node");
			}
		});
		const client = makeClient(node, [player]);
		audio.watchAudioNodes(client);
		node.connected = false;
		client.player.nodeManager.emit("disconnect", node, { code: 1006 });
		const member: any = {
			guild: {
				id: player.guildId,
				members: { me: { voice: { channelId: player.voiceChannelId } } }
			},
			voice: {
				channelId: player.voiceChannelId,
				channel: { id: player.voiceChannelId }
			}
		};
		return { client, player, member };
	};

	test("pause, skip and volume say the server is restarting, not 'nothing is playing'", async () => {
		const { client, member } = setup();
		expect(await controls.pauseMusic(client, member)).toEqual({
			ok: false,
			reason: "audio_unavailable"
		});
		expect(await controls.setMusicVolume(client, member, 50)).toEqual({
			ok: false,
			reason: "audio_unavailable"
		});
		const lang: any = {};
		expect(await controls.skipMusic(client, member, lang, null)).toEqual({
			ok: false,
			reason: "audio_unavailable"
		});
	});

	test("the queue still answers (shuffle), stop leaves", async () => {
		const { client, player, member } = setup();
		expect(await controls.shuffleMusic(client, member)).toEqual({
			ok: true
		});
		expect(await controls.stopMusic(client, member)).toEqual({
			ok: true,
			tts: false
		});
		expect(player.destroyed).toBe(true);
	});
});
