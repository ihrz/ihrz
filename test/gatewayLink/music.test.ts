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

import { describe, expect, mock, test } from "bun:test";
import { PermissionsBitField } from "discord.js";

const calls: string[] = [];
let ttsEnabled = false;
let enqueueResult: unknown = { ok: false, reason: "no_result" };
let enqueueArgs: any = null;

mock.module("../../src/core/modules/ttsManager.js", () => ({
	getTTSData: async () => (ttsEnabled ? { enabled: true } : null),
	cleanupTTS: async () => calls.push("cleanupTTS")
}));
mock.module("../../src/core/modules/musicCrossfadeSkip.js", () => ({
	crossfadeSkip: async (_p: unknown, to = 0) => calls.push(`crossfade:${to}`)
}));
mock.module("../../src/core/functions/musicPlay.js", () => ({
	enqueueMusicQueries: async (args: unknown) => {
		enqueueArgs = args;
		return enqueueResult;
	},
	announceMusicPlay: async () => calls.push("announce"),
	recordMusicPlay: async () => calls.push("record"),
	isUrlQuery: (q: string) => /^https?:\/\//.test(q),
	stripChoiceDuration: (q: string) => q
}));
mock.module("../../src/core/modules/musicAutocomplete.js", () => ({
	searchTrackSuggestions: async () => []
}));

const { musicActions, musicState, trackView, QUEUE_MAX } =
	await import("../../src/core/modules/gatewayLinkActions/music.ts");
const controls = await import("../../src/core/modules/musicControls.ts");
const { Params, ActionError } =
	await import("../../src/core/modules/gatewayLinkActions/types.ts");

const BOT_VC = "700000000000000000";
const OTHER_VC = "710000000000000000";
const TEXT = "720000000000000000";

function track(id: string, duration = 180_000, stream = false) {
	return {
		encoded: `enc-${id}`,
		requester: { id: "900000000000000000" },
		info: {
			identifier: id,
			title: `Title ${id}`,
			author: "Artist",
			uri: `https://example.com/${id}`,
			artworkUrl: null,
			duration,
			isStream: stream,
			sourceName: "deezer"
		}
	};
}

function makePlayer(over: Record<string, unknown> = {}) {
	const p: any = {
		guildId: "100000000000000000",
		voiceChannelId: BOT_VC,
		textChannelId: TEXT,
		connected: true,
		playing: true,
		paused: false,
		volume: 75,
		repeatMode: "off",
		position: 60_000,
		queue: {
			current: track("a"),
			tracks: [track("b"), track("c", 0, true)],
			shuffle: async () => calls.push("shuffle"),
			splice: async (s: number, n: number) => {
				p.queue.tracks.splice(s, n);
			}
		},
		pause: async () => {
			p.paused = true;
		},
		resume: async () => {
			p.paused = false;
		},
		stopPlaying: async () => calls.push("stopPlaying"),
		setRepeatMode: async (m: string) => {
			p.repeatMode = m;
		},
		setVolume: async (v: number) => {
			p.volume = v;
		},
		...over
	};
	return p;
}

// A text channel nobody can post in unless a test says otherwise.
const fakeChannel = (id: string, name: string): any => ({
	id,
	name,
	isTextBased: () => true,
	permissionsFor: () => null,
	send: async () => null
});

function setup(actorVoice: string | null, player?: any, botVoice = BOT_VC) {
	const channels = new Map<string, any>([
		[BOT_VC, fakeChannel(BOT_VC, "Music")],
		[TEXT, fakeChannel(TEXT, "music-text")]
	]);
	const guild: any = {
		id: "100000000000000000",
		channels: { cache: channels },
		members: { me: { voice: { channelId: botVoice } } }
	};
	const actor: any = {
		id: "300000000000000000",
		guild,
		user: { id: "300000000000000000" },
		voice: {
			channelId: actorVoice,
			channel: actorVoice
				? (channels.get(actorVoice) ?? { id: actorVoice })
				: null
		},
		toString: () => "<@300000000000000000>"
	};
	const client: any = {
		player: { getPlayer: () => player },
		iHorizon_Emojis: { Music_Icon: "" }
	};
	const lang: any = {
		event_mp_playerSkip: "skip ${trackTitle}",
		queue_jumped: "${author} ${track}"
	};
	const ctx = (params: Record<string, unknown> = {}) => ({
		client,
		guild,
		actor,
		lang,
		params: new Params(params)
	});
	return { client, guild, actor, ctx };
}

const refused = async (p: Promise<unknown>) => {
	const e = await p.then(
		() => null,
		(err) => err
	);
	expect(e).toBeInstanceOf(ActionError);
	return (e as Error).message;
};

describe("music.state", () => {
	test("no player: inactive, no side effect", async () => {
		const { ctx } = setup(null);
		const s: any = await musicActions["music.state"].run(ctx() as any);
		expect(s.active).toBe(false);
		expect(s.queue).toEqual([]);
		expect(s.actor).toEqual({ voiceChannelId: null, inBotChannel: false });
	});

	test("player: current track, queue and totals", async () => {
		const player = makePlayer();
		const { ctx } = setup(BOT_VC, player);
		const s: any = await musicActions["music.state"].run(ctx() as any);
		expect(s.voiceChannel).toEqual({ id: BOT_VC, name: "Music" });
		expect(s.textChannel).toEqual({ id: TEXT, name: "music-text" });
		expect(s.current.title).toBe("Title a");
		expect(s.current.requesterId).toBe("900000000000000000");
		expect(s.position).toBe(60_000);
		expect(s.queueLength).toBe(2);
		// The live stream doesn't count.
		expect(s.queueDuration).toBe(180_000);
		expect(s.queue[1].isStream).toBe(true);
		expect(s.actor.inBotChannel).toBe(true);
		expect(calls).toEqual([]);
	});

	test("queue capped, position clamped", () => {
		const tracks = Array.from({ length: 150 }, (_, i) => track(`t${i}`));
		const player = makePlayer({ position: 999_999_999 });
		player.queue.tracks = tracks;
		const { guild, actor } = setup(null, player);
		const s = musicState(guild, actor, player);
		expect(s.queue.length).toBe(QUEUE_MAX);
		expect(s.queueLength).toBe(150);
		expect(s.position).toBe(180_000);
		expect(trackView(track("x", 0) as any).isStream).toBe(true);
	});
});

describe("music controls", () => {
	test("pause needs the bot's voice channel", async () => {
		const player = makePlayer();
		const away = setup(OTHER_VC, player);
		expect(
			await refused(musicActions["music.pause"].run(away.ctx() as any))
		).toContain("forbidden");
		const none = setup(null, player);
		expect(
			await refused(musicActions["music.pause"].run(none.ctx() as any))
		).toBe("you must be in a voice channel");
		const ok = setup(BOT_VC, player);
		const r: any = await musicActions["music.pause"].run(ok.ctx() as any);
		expect(r.paused).toBe(true);
		expect(r.state.paused).toBe(true);
	});

	test("resume does not throw when not paused", async () => {
		const player = makePlayer();
		const { ctx } = setup(BOT_VC, player);
		await musicActions["music.resume"].run(ctx() as any);
		expect(player.paused).toBe(false);
	});

	test("shuffle needs 2 tracks, nothing playing is refused", async () => {
		const player = makePlayer();
		player.queue.tracks = [track("b")];
		const { ctx } = setup(BOT_VC, player);
		expect(
			await refused(musicActions["music.shuffle"].run(ctx() as any))
		).toContain("at least 2");
		const idle = setup(BOT_VC, undefined);
		expect(
			await refused(musicActions["music.shuffle"].run(idle.ctx() as any))
		).toBe("nothing is playing");
	});

	test("skip announces in the text channel and crossfades", async () => {
		calls.length = 0;
		const sent: unknown[] = [];
		const player = makePlayer();
		const { ctx, guild } = setup(BOT_VC, player);
		guild.channels.cache.get(TEXT).send = async (m: unknown) =>
			sent.push(m);
		const r: any = await musicActions["music.skip"].run(ctx() as any);
		expect(calls).toContain("crossfade:0");
		expect(sent.length).toBe(1);
		expect(r.skipped).toBe("Title a");
	});

	test("stop stops a TTS session first", async () => {
		calls.length = 0;
		ttsEnabled = true;
		const { ctx } = setup(BOT_VC, makePlayer());
		const r: any = await musicActions["music.stop"].run(ctx() as any);
		ttsEnabled = false;
		expect(r.tts).toBe(true);
		expect(calls).toEqual(["cleanupTTS"]);
	});

	test("clear empties the upcoming tracks", async () => {
		const player = makePlayer();
		const { ctx } = setup(BOT_VC, player);
		const r: any = await musicActions["music.clear"].run(ctx() as any);
		expect(r.removed).toBe(2);
		expect(player.queue.tracks.length).toBe(0);
	});

	test("loop and volume validate their parameters", async () => {
		const player = makePlayer();
		const { ctx } = setup(BOT_VC, player);
		expect(
			await refused(
				musicActions["music.loop"].run(ctx({ mode: "all" }) as any)
			)
		).toBe("invalid parameter: mode");
		await musicActions["music.loop"].run(ctx({ mode: "queue" }) as any);
		expect(player.repeatMode).toBe("queue");
		expect(
			await refused(
				musicActions["music.volume"].run(ctx({ value: 500 }) as any)
			)
		).toContain("at most");
		await musicActions["music.volume"].run(ctx({ value: 40 }) as any);
		expect(player.volume).toBe(40);
		expect(player.customVolume).toBe(40);
	});

	test("volume, like the command, works from another voice channel", async () => {
		const player = makePlayer();
		const r = await controls.setMusicVolume(
			setup(OTHER_VC, player).client,
			setup(OTHER_VC, player).actor,
			30
		);
		expect(r.ok).toBe(true);
	});

	test("skip-to checks the index and the expected track", async () => {
		calls.length = 0;
		const player = makePlayer();
		const { ctx } = setup(BOT_VC, player);
		expect(
			await refused(
				musicActions["music.skip-to"].run(ctx({ index: 5 }) as any)
			)
		).toBe("track not found");
		expect(
			await refused(
				musicActions["music.skip-to"].run(
					ctx({ index: 0, identifier: "zzz" }) as any
				)
			)
		).toContain("queue changed");
		await musicActions["music.skip-to"].run(
			ctx({ index: 1, identifier: "c" }) as any
		);
		expect(calls).toEqual(["crossfade:2"]);
	});
});

describe("music.play", () => {
	test("refused outside a voice channel, before any search", async () => {
		enqueueArgs = null;
		const { ctx } = setup(null);
		expect(
			await refused(
				musicActions["music.play"].run(ctx({ query: "song" }) as any)
			)
		).toContain("voice channel");
		expect(enqueueArgs).toBeNull();
	});

	test("an explicit text channel must be one the user can post in", async () => {
		const { ctx, guild } = setup(BOT_VC);
		guild.channels.cache.get(TEXT).isTextBased = () => true;
		guild.channels.cache.get(TEXT).permissionsFor = () =>
			new PermissionsBitField(0n);
		expect(
			await refused(
				musicActions["music.play"].run(
					ctx({ query: "song", channelId: TEXT }) as any
				)
			)
		).toContain("forbidden");
		expect(
			await refused(
				musicActions["music.play"].run(
					ctx({
						query: "song",
						channelId: "730000000000000000"
					}) as any
				)
			)
		).toBe("channel not found");
	});

	test("maps refusals and records history without a panel", async () => {
		const { ctx } = setup(BOT_VC);
		enqueueResult = { ok: false, reason: "music_cannot" };
		expect(
			await refused(
				musicActions["music.play"].run(ctx({ query: "song" }) as any)
			)
		).toContain("forbidden");

		calls.length = 0;
		const player = makePlayer();
		enqueueResult = {
			ok: true,
			player,
			firstResult: { loadType: "track", tracks: [track("n")] }
		};
		// The voice channel's chat is not postable here (no permissionsFor).
		const r: any = await musicActions["music.play"].run(
			ctx({ query: "song" }) as any
		);
		expect(enqueueArgs.textChannelId).toBe(BOT_VC);
		expect(enqueueArgs.sourceChannelId).toBeNull();
		expect(r.panelChannelId).toBeNull();
		expect(r.track.title).toBe("Title n");
		await Promise.resolve();
		expect(calls).toEqual(["record"]);
	});
});

describe("music.search / music.lyrics", () => {
	test("search: URLs are played as is, short queries refused", async () => {
		const { ctx } = setup(null);
		expect(
			await musicActions["music.search"].run(
				ctx({ query: "https://x.y/z" }) as any
			)
		).toEqual({ url: true, results: [] });
		expect(
			await refused(
				musicActions["music.search"].run(ctx({ query: "a" }) as any)
			)
		).toContain("at least");
	});

	test("lyrics of the current track need something playing", async () => {
		const { ctx, client } = setup(null, undefined);
		client.func = { searchLyrics: async () => null };
		expect(
			await refused(musicActions["music.lyrics"].run(ctx() as any))
		).toBe("nothing is playing");
		const player = makePlayer();
		client.player.getPlayer = () => player;
		client.func.searchLyrics = async (t: any) => ({
			track: t,
			res: { text: "la la", provider: "lyrics.ovh" }
		});
		const r: any = await musicActions["music.lyrics"].run(ctx() as any);
		expect(r.text).toBe("la la");
		expect(r.track.title).toBe("Title a");
	});
});
