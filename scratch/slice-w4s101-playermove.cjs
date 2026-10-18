// W4 slice 101 battery: replicates TS `handlePlayerMove`
// (src/core/modules/lastFMScrobblerManager.ts) + the lavalink-client
// `playerMove` emission gate
// (node_modules/lavalink-client/dist/index.js:
// `if (player.voiceChannelId !== update.channel_id)
// this.emit("playerMove", ...)`) verbatim.
const assert = require('node:assert');

let syncCalls = 0;
let seenAtSync = null;

// Verbatim replica of handlePlayerMove with injectable sync.
async function handlePlayerMove(store, guildId, newVoiceChannelId, syncFn) {
	const session = store.get(guildId);
	if (!session) return;
	session.voiceChannelId = newVoiceChannelId;
	await syncFn(session);
}

// Sync stub replicating the syncMembersWithVoiceChannel abort legs:
// guild fetch miss -> return with listeners kept; otherwise detach-all
// not in the new channel + attach newcomers (order: detach first).
async function syncStubFactory({ guildOk, members }) {
	return async (session) => {
		syncCalls++;
		seenAtSync = session.voiceChannelId;
		if (!guildOk) return; // TS `if (!guild) return` — listeners kept
		for (const id of [...session.listeners.keys()]) {
			if (!members.includes(id)) session.listeners.delete(id);
		}
		for (const id of members) {
			if (!session.listeners.has(id)) session.listeners.set(id, { userId: id });
		}
	};
}

// Emission gate replica (lavalink-client, verbatim `!==`).
function emitsPlayerMove(voiceChannelId, updateChannelId) {
	return voiceChannelId !== updateChannelId;
}

async function main() {
	// M1: missing session -> no write, sync never runs.
	{
		const store = new Map();
		syncCalls = 0;
		await handlePlayerMove(store, 'g1', 'new', await syncStubFactory({ guildOk: true, members: [] }));
		assert.strictEqual(store.has('g1'), false);
		assert.strictEqual(syncCalls, 0);
	}

	// M2: rebind lands BEFORE sync runs (sync observes the new id).
	{
		const store = new Map([['g2', { voiceChannelId: 'old', listeners: new Map([[1, {}]]) }]]);
		syncCalls = 0; seenAtSync = null;
		await handlePlayerMove(store, 'g2', 'new', await syncStubFactory({ guildOk: true, members: [1] }));
		assert.strictEqual(store.get('g2').voiceChannelId, 'new');
		assert.strictEqual(seenAtSync, 'new');
		assert.strictEqual(syncCalls, 1);
	}

	// M3: sync abort (guild fetch miss) -> rebind STANDS, listeners kept.
	{
		const store = new Map([['g3', { voiceChannelId: 'old', listeners: new Map([[1, {}], [2, {}]]) }]]);
		syncCalls = 0;
		await handlePlayerMove(store, 'g3', 'new', await syncStubFactory({ guildOk: false, members: [] }));
		assert.strictEqual(store.get('g3').voiceChannelId, 'new');
		assert.deepStrictEqual([...store.get('g3').listeners.keys()], [1, 2]);
		assert.strictEqual(syncCalls, 1);
	}

	// M4: emission gate — identical ids never emit (strict `!==`,
	// including number-vs-string `1 !== '1'` which DOES emit).
	{
		assert.strictEqual(emitsPlayerMove('a', 'a'), false);
		assert.strictEqual(emitsPlayerMove('a', 'b'), true);
		assert.strictEqual(emitsPlayerMove(undefined, undefined), false);
		assert.strictEqual(emitsPlayerMove(undefined, 'a'), true);
		assert.strictEqual(emitsPlayerMove(1, '1'), true);
	}

	// M5: full move composition — detach leavers, attach joiners, id stands.
	{
		const store = new Map([['g5', { voiceChannelId: 'old', listeners: new Map([[1, {}], [7, {}]]) }]]);
		await handlePlayerMove(store, 'g5', 'new', await syncStubFactory({ guildOk: true, members: [1, 8] }));
		assert.strictEqual(store.get('g5').voiceChannelId, 'new');
		assert.deepStrictEqual([...store.get('g5').listeners.keys()], [1, 8]);
	}

	// M6: direct same-id call into the handler (unreachable via the live
	// emitter per M4, but documents the shape): TS rebinds (no-op) and
	// STILL syncs — no same-channel early-out exists in the handler.
	{
		const store = new Map([['g6', { voiceChannelId: 'same', listeners: new Map() }]]);
		syncCalls = 0;
		await handlePlayerMove(store, 'g6', 'same', await syncStubFactory({ guildOk: true, members: [9] }));
		assert.strictEqual(store.get('g6').voiceChannelId, 'same');
		assert.strictEqual(syncCalls, 1);
		assert.deepStrictEqual([...store.get('g6').listeners.keys()], [9]);
	}

	console.log('green 15/15');
}

main().catch((e) => { console.error('RED:', e.message); process.exit(1); });
