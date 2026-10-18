'use strict';
// W4 slice 78 battery: tryScrobbleListener timer-leg (finalize=false)
// stale-session guard + isMemberInVoiceChannel presence gate, verbatim
// from src/core/modules/lastFMScrobblerManager.ts.

// --- stale guard leg ---
// if (!finalize) {
//   const activeSession = this.guildSessions.get(session.guildId);
//   if (!activeSession || activeSession.trackKey !== session.trackKey) return false;
function staleGuard(sessions, guildId, trackKey, finalize) {
	if (!finalize) {
		const activeSession = sessions.get(guildId);
		if (!activeSession || activeSession.trackKey !== trackKey) return false;
	}
	return true;
}

// --- presence leg ---
// const isStillInChannel = await this.isMemberInVoiceChannel(g, ch, uid);
// if (!isStillInChannel) return false;   (timer leg only)
// isMemberInVoiceChannel: member?.voice.channelId === voiceChannelId
// (guild/member fetch miss -> null -> undefined === id -> false)
function stillInChannel(memberVoiceChannelId, trackedChannelId) {
	return memberVoiceChannelId === trackedChannelId;
}

const cases = [
	// [name, sessionsMapEntries, guildId, trackKey, finalize, expected]
	['timer same key proceeds', [['g1', { trackKey: 'k1' }]], 'g1', 'k1', false, true],
	['timer stale key dies', [['g1', { trackKey: 'k2' }]], 'g1', 'k1', false, false],
	['timer no session dies', [], 'g1', 'k1', false, false],
	['finalize skips stale guard (same)', [['g1', { trackKey: 'k1' }]], 'g1', 'k1', true, true],
	['finalize skips stale guard (stale)', [['g1', { trackKey: 'k2' }]], 'g1', 'k1', true, true],
	['finalize skips stale guard (gone)', [], 'g1', 'k1', true, true],
];

let fail = 0;
for (const [name, entries, gid, key, fin, want] of cases) {
	const got = staleGuard(new Map(entries), gid, key, fin);
	const ok = got === want;
	if (!ok) fail++;
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got=${got} want=${want}`);
}

const presence = [
	// [name, memberVoiceChannelId, tracked, expected]
	['same channel', 'ch7', 'ch7', true],
	['other channel', 'ch9', 'ch7', false],
	['no voice state (undefined)', undefined, 'ch7', false],
	['null member leg', null, 'ch7', false],
	['empty vs tracked', '', 'ch7', false],
	['numeric-string strict (7 vs 7-string)', '7', '7', true],
];

for (const [name, memCh, tracked, want] of presence) {
	const got = stillInChannel(memCh, tracked);
	const ok = got === want;
	if (!ok) fail++;
	console.log(`${ok ? 'PASS' : 'FAIL'} presence ${name}: got=${got} want=${want}`);
}

// elapsed/re-arm ordering leg (verbatim):
// if (elapsed < threshold) { if (!finalize) scheduleScrobble(...); return false; }
function afterGates(elapsed, threshold, finalize) {
	if (elapsed < threshold) {
		return finalize ? 'false-no-rearm' : 'false-rearm';
	}
	return 'post';
}
const order = [
	['timer below -> rearm', 1000, 5000, false, 'false-rearm'],
	['finalize below -> no rearm', 1000, 5000, true, 'false-no-rearm'],
	['timer due -> post', 6000, 5000, false, 'post'],
	['finalize due -> post', 6000, 5000, true, 'post'],
	['exact threshold -> post', 5000, 5000, false, 'post'],
];
for (const [name, el, th, fin, want] of order) {
	const got = afterGates(el, th, fin);
	const ok = got === want;
	if (!ok) fail++;
	console.log(`${ok ? 'PASS' : 'FAIL'} order ${name}: got=${got} want=${want}`);
}

console.log(fail === 0 ? 'BATTERY GREEN 17/17' : `BATTERY RED ${fail} failures`);
process.exit(fail === 0 ? 0 : 1);
