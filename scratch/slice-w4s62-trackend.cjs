// W4 slice 62 battery: handleTrackEnd finalize gate
// (src/core/modules/lastFMScrobblerManager.ts:278).
// TS: `if (reason !== "loadFailed") await tryScrobbleListener(..., true)`
// Verbatim replica over the lavalink-client TrackEndReason union.
const assert = require('node:assert');

// Exact TS gate, copied from handleTrackEnd.
function tsFinalizes(reason) {
  return reason !== 'loadFailed';
}

const reasons = ['finished', 'loadFailed', 'stopped', 'replaced', 'cleanup'];
const expected = {
  finished: true,   // natural end -> finalize counts when due
  loadFailed: false, // decode failure -> no credit, session still dropped
  stopped: true,    // manual stop -> finalize counts when due
  replaced: true,   // skip/replace -> finalize counts when due (TS scrobbles
                    // a past-threshold listen even though a new track starts)
  cleanup: true,    // node cleanup -> finalize counts when due
};

let n = 0;
for (const r of reasons) {
  assert.strictEqual(tsFinalizes(r), expected[r], `reason ${r}`);
  n++;
}
// Case-sensitivity: the gate is a strict string compare.
assert.strictEqual(tsFinalizes('LoadFailed'), true);
assert.strictEqual(tsFinalizes('LOADFAILED'), true);
assert.strictEqual(tsFinalizes(''), true);
n += 3;
console.log(`green ${n}/${n} — TS finalizes on every reason except exact "loadFailed"`);
