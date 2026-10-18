// W4 slice 84 battery: lastFMScrobblerManager.ts `isMemberInVoiceChannel`
// replicated verbatim:
//
//   const guild = await client.guilds.fetch(guildId).catch(() => null);
//   if (!guild) return false;
//   const member =
//     guild.members.cache.get(userId) ||
//     (await guild.members.fetch(userId).catch(() => null));
//   return member?.voice.channelId === voiceChannelId;
//
// Legs: guild-miss, cache-hit same/other/null-channel, cache-miss +
// fetch-hit same/other/null, fetch-miss, cache-hit-wins short-circuit
// (fetch would disagree but must never run).
'use strict';

function makeWorld({ guildMiss, cached, fetched, fetchShouldThrow }) {
	let fetchCalls = 0;
	const client = {
		guilds: {
			fetch: async () =>
				guildMiss
					? Promise.reject(new Error('unknown guild')).catch(() => null)
					: guild,
		},
	};
	const guild = {
		members: {
			cache: { get: (id) => (cached && cached.id === id ? cached : undefined) },
			fetch: async (id) => {
				fetchCalls++;
				if (fetchShouldThrow) throw new Error('unknown member');
				return fetched && fetched.id === id ? fetched : null;
			},
		},
	};
	// Mirror the TS chain exactly, including the .catch(() => null) folds.
	async function isMemberInVoiceChannel(guildId, voiceChannelId, userId) {
		const g = await client.guilds.fetch(guildId).catch(() => null);
		if (!g) return false;
		const member =
			g.members.cache.get(userId) ||
			(await g.members.fetch(userId).catch(() => null));
		return member?.voice.channelId === voiceChannelId;
	}
	return { isMemberInVoiceChannel, calls: () => fetchCalls };
}

const M = (id, channelId) => ({ id, user: { bot: false }, voice: { channelId } });

const cases = [
	// [name, world, userId, channel, expected, expectFetchCalls]
	['guild-miss', { guildMiss: true }, 'u1', 'c1', false, 0],
	['cache-hit-same', { cached: M('u1', 'c1') }, 'u1', 'c1', true, 0],
	['cache-hit-other', { cached: M('u1', 'c2') }, 'u1', 'c1', false, 0],
	['cache-hit-voiceless', { cached: M('u1', null) }, 'u1', 'c1', false, 0],
	['cache-hit-undefined', { cached: M('u1', undefined) }, 'u1', 'c1', false, 0],
	['fetch-hit-same', { fetched: M('u1', 'c1') }, 'u1', 'c1', true, 1],
	['fetch-hit-other', { fetched: M('u1', 'c2') }, 'u1', 'c1', false, 1],
	['fetch-hit-voiceless', { fetched: M('u1', null) }, 'u1', 'c1', false, 1],
	['fetch-miss', { fetchShouldThrow: true }, 'u1', 'c1', false, 1],
	['fetch-null-row', {}, 'u1', 'c1', false, 1],
	// Short-circuit: cache hit wins, fetch (which would disagree) never runs.
	['cache-wins-over-fetch', { cached: M('u1', 'c1'), fetched: M('u1', 'c9') }, 'u1', 'c1', true, 0],
	['cache-miss-other-user', { cached: M('u9', 'c1'), fetched: M('u1', 'c1') }, 'u1', 'c1', true, 1],
];

(async () => {
	let pass = 0;
	for (const [name, world, uid, ch, want, wantCalls] of cases) {
		const w = makeWorld(world);
		const got = await w.isMemberInVoiceChannel('g1', ch, uid);
		const calls = w.calls();
		const ok = got === want && calls === wantCalls;
		console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got=${got} calls=${calls} want=${want}/${wantCalls}`);
		if (ok) pass++;
	}
	console.log(`${pass}/${cases.length}`);
	if (pass !== cases.length) process.exit(1);
})();
