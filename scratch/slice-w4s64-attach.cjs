'use strict';
// Slice W4-64 battery: TS attachMemberToSession + scheduleScrobble +
// tryScrobbleListener gate order, replicated verbatim from
// src/core/modules/lastFMScrobblerManager.ts (deps mocked, no network).
// Verdicts: 'attached+timer' | 'attached+noschedule' | 'attached+fire-now' |
//           'dropped-invalid' | 'dropped-no-row' | 'dup' | 'scrobble' | 'nosrobble'.

const shouldScrobble = (track) => track.durationMs >= 30_000;
const getThresholdMs = (track) => Math.min(track.durationMs / 2, 240_000);
const isInvalidSessionError = (r) =>
  r.errorCode === 9 || r.errorCode === 4 ||
  (typeof r.message === 'string' && /session/i.test(r.message));

// Verbatim attachMemberToSession control flow (auth/np mocked per case).
function attachFlow({ has, auth, np, track }) {
  if (has) return { verdict: 'dup', npPosts: 0 };
  if (!auth || !auth.enabled) return { verdict: 'dropped-no-row', npPosts: 0 };
  const listener = { scrobbled: false, thresholdMs: getThresholdMs(track) };
  const npPosts = 1; // updateNowPlaying always attempted (no duration gate)
  if (!np.ok && isInvalidSessionError(np)) return { verdict: 'dropped-invalid', npPosts, invalidated: true };
  // scheduleScrobble leg (elapsed ~0 at attach):
  if (!shouldScrobble(track) || listener.scrobbled) return { verdict: 'attached+noschedule', npPosts };
  const remaining = listener.thresholdMs - 0;
  if (remaining <= 0) return { verdict: 'attached+fire-now', npPosts };
  return { verdict: 'attached+timer', npPosts };
}

// Verbatim tryScrobbleListener gate order (finalize=true from end/detach).
function finalizeFlow({ scrobbled, track, elapsedMs }) {
  if (scrobbled || !shouldScrobble(track)) return 'nosrobble';
  if (elapsedMs < getThresholdMs(track)) return 'nosrobble';
  return 'scrobble';
}

const LONG = { durationMs: 200_000 };   // threshold 100s
const SHORT = { durationMs: 20_000 };   // threshold 10s, shouldScrobble false
const OK = { ok: true };
const INVALID = { ok: false, errorCode: 9, message: 'Invalid session key' };
const TRANSIENT = { ok: false, message: 'fetch failed' }; // network blip / HTTP 500, no session word

const cases = [
  // [name, attach input, expected attach verdict, finalize input, expected finalize]
  ['A long/np-ok', { has: false, auth: { enabled: true }, np: OK, track: LONG }, 'attached+timer', null, null],
  ['B long/np-invalid', { has: false, auth: { enabled: true }, np: INVALID, track: LONG }, 'dropped-invalid', null, null],
  ['C long/np-transient', { has: false, auth: { enabled: true }, np: TRANSIENT, track: LONG }, 'attached+timer', null, null],
  ['D short/np-ok', { has: false, auth: { enabled: true }, np: OK, track: SHORT }, 'attached+noschedule', null, null],
  ['E short/np-transient', { has: false, auth: { enabled: true }, np: TRANSIENT, track: SHORT }, 'attached+noschedule', null, null],
  ['F dup', { has: true, auth: { enabled: true }, np: OK, track: LONG }, 'dup', null, null],
  ['G no-row', { has: false, auth: null, np: OK, track: LONG }, 'dropped-no-row', null, null],
  ['H finalize long past threshold', null, null, { scrobbled: false, track: LONG, elapsedMs: 150_000 }, 'scrobble'],
  ['I finalize short past threshold', null, null, { scrobbled: false, track: SHORT, elapsedMs: 20_000 }, 'nosrobble'],
  ['J finalize long under threshold', null, null, { scrobbled: false, track: LONG, elapsedMs: 50_000 }, 'nosrobble'],
  ['K finalize already scrobbled', null, null, { scrobbled: true, track: LONG, elapsedMs: 150_000 }, 'nosrobble'],
];

let fail = 0;
for (const [name, ain, awant, fin, fwant] of cases) {
  if (ain) {
    const got = attachFlow(ain).verdict;
    const ok = got === awant;
    if (!ok) fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: attach=${got} (want ${awant})`);
  }
  if (fin) {
    const got = finalizeFlow(fin);
    const ok = got === fwant;
    if (!ok) fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: finalize=${got} (want ${fwant})`);
  }
}
// D1 crux: transient np failure still attaches (old Rust dropped).
// D2 crux: short tracks get the now-playing POST + attach (old Rust skipped),
//          but never scrobble (finalize gate).
if (fail) { console.error(`${fail} case(s) FAILED`); process.exit(1); }
console.log('green 11/11');
