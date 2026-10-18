// Slice W4-92 battery: getElapsedListeningMs + handlePlayerUpdate pause/resume
// banking vs the Rust saturation helpers, verbatim from
// src/core/modules/lastFMScrobblerManager.ts (Date.now injected as `now`).
function getElapsedListeningMs(l, now) {
	const currentPauseDuration = l.pausedStartedAt
		? now - l.pausedStartedAt
		: 0;
	return now - l.startedAt - l.pausedDurationMs - currentPauseDuration;
}
// handlePlayerUpdate pause leg: listener.pausedStartedAt = now
// handlePlayerUpdate resume leg:
function resumeBank(l, now) {
	if (l.pausedStartedAt) {
		l.pausedDurationMs += now - l.pausedStartedAt;
		l.pausedStartedAt = undefined;
	}
}
// Rust mirrors under test:
// elapsed_listening_ms: open=(now-s).max(0), wall=(now-start).max(0), wall-bank-open saturated
// lastfm_paused_total: bank + max(0, now-openStart); lastfm_listener_elapsed: wall-pausedTotal saturated
function rustElapsed(started, bank, openStart, now) {
	const open = openStart === undefined ? 0 : Math.max(0, now - openStart);
	const wall = Math.max(0, now - started);
	return Math.max(0, wall - bank - open);
}
const cases = [
	// N-legs: steady clock, must agree exactly.
	{ id: "N1", l: { startedAt: 0, pausedDurationMs: 0, pausedStartedAt: undefined }, now: 100000, want: 100000 },
	{ id: "N2", l: { startedAt: 0, pausedDurationMs: 20000, pausedStartedAt: undefined }, now: 100000, want: 80000 },
	{ id: "N3", l: { startedAt: 0, pausedDurationMs: 20000, pausedStartedAt: 90000 }, now: 100000, want: 70000 },
	{ id: "N4", l: { startedAt: 5000, pausedDurationMs: 0, pausedStartedAt: 90000 }, now: 100000, want: 85000 },
	// S-legs: clock skew (backwards NTP step). TS goes negative/inflated.
	{ id: "S1", l: { startedAt: 100000, pausedDurationMs: 0, pausedStartedAt: undefined }, now: 90000, want: -10000, rustWant: 0 },
	{ id: "S2", l: { startedAt: 0, pausedDurationMs: 20000, pausedStartedAt: undefined }, now: 10000, want: -10000, rustWant: 0 },
	{ id: "S3", l: { startedAt: 0, pausedDurationMs: 0, pausedStartedAt: 110000 }, now: 100000, want: 110000, rustWant: 100000 },
];
let fail = 0;
for (const c of cases) {
	const got = getElapsedListeningMs(c.l, c.now);
	const rg = rustElapsed(c.l.startedAt, c.l.pausedDurationMs, c.l.pausedStartedAt, c.now);
	const okTs = got === c.want;
	const okRust = rg === (c.rustWant ?? c.want);
	if (!okTs || !okRust) fail++;
	console.log(`${okTs && okRust ? "PASS" : "FAIL"} ${c.id}: ts=${got} (want ${c.want}) rust=${rg} (want ${c.rustWant ?? c.want})`);
}
// Resume-banking legs: R1 steady (+30000), R2 clock stepped back (bank DEcreases).
const r1 = { startedAt: 0, pausedDurationMs: 0, pausedStartedAt: 50000 };
resumeBank(r1, 80000);
console.log(`${r1.pausedDurationMs === 30000 ? "PASS" : "FAIL"} R1: bank=${r1.pausedDurationMs} (want 30000)`);
if (r1.pausedDurationMs !== 30000) fail++;
const r2 = { startedAt: 0, pausedDurationMs: 50000, pausedStartedAt: 80000 };
resumeBank(r2, 50000);
console.log(`${r2.pausedDurationMs === 20000 ? "PASS" : "FAIL"} R2: bank=${r2.pausedDurationMs} (want 20000, TS subtracts the negative step; Rust max(0) adds 0 -> DELTA)`);
if (r2.pausedDurationMs !== 20000) fail++;
// Falsy-0 pausedStartedAt leg: `if (listener.pausedStartedAt)` / ternary skips 0.
const r3 = { startedAt: 0, pausedDurationMs: 7000, pausedStartedAt: 0 };
const e3 = getElapsedListeningMs(r3, 100000);
console.log(`${e3 === 93000 ? "PASS" : "FAIL"} R3: elapsed=${e3} (want 93000, 0 is falsy so no open leg)`);
if (e3 !== 93000) fail++;
console.log(fail === 0 ? `GREEN ${cases.length + 3}/${cases.length + 3}` : `DIVERGENT (${fail} failures)`);
process.exit(fail === 0 ? 0 : 1);
