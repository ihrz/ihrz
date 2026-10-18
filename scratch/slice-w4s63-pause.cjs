// W4 slice 63 battery: TS per-listener pause banking vs Rust session-level charge.
// TS: attach sets pausedDurationMs=0, pausedStartedAt=(session.paused?now:undefined);
// pause banks per-listener from ITS attach; elapsed = now-started-banked-current.
function tsElapsed(startedAt, pausedDurationMs, pausedStartedAt, now) {
  const cur = pausedStartedAt ? now - pausedStartedAt : 0;
  return now - startedAt - pausedDurationMs - cur;
}
// Rust (pre-fix): elapsed = (now-started) - sessionPausedTotal(now), same total for all.
function rsElapsed(startedMs, sessionPausedTotal, now) {
  return Math.max(0, now - startedMs) - Math.min(sessionPausedTotal, Math.max(0, now - startedMs));
}
let pass = 0, fail = 0;
function eq(name, ts, rs, expectDiverge) {
  const same = ts === rs;
  const ok = expectDiverge ? !same : same;
  if (ok) pass++; else { fail++; console.log(`FAIL ${name}: ts=${ts} rs=${rs} expectDiverge=${expectDiverge}`); }
}
// Scenario 1: pause 1000..3000, A attached at 0, B joins mid-pause at 2000, end at 5000.
const P0 = 1000, P1 = 3000, E = 5000;
// A: banked P1-P0=2000, no ongoing.
eq('A pre-pause member', tsElapsed(0, 2000, undefined, E), rsElapsed(0, 2000, E), false);
// B: attached at 2000 while paused -> pausedStartedAt=2000, banks 1000 at resume.
eq('B mid-pause joiner DIVERGES', tsElapsed(2000, 1000, undefined, E), rsElapsed(2000, 2000, E), true);
// Scenario 2: C attaches at 4000 (after full pause cycle): TS banks 0.
eq('C post-pause joiner DIVERGES', tsElapsed(4000, 0, undefined, E), rsElapsed(4000, 2000, E), true);
// Scenario 3: D attaches at 2000 while paused, track ends DURING pause at 2500.
eq('D end-during-pause CONVERGES (clamp)',
  tsElapsed(2000, 0, 2000, 2500), rsElapsed(2000, 1500 /*total at 2500: banked 0 + ongoing 1500*/, 2500), false);
// Scenario 4: no pause at all -> convergent.
eq('E no-pause', tsElapsed(0, 0, undefined, E), rsElapsed(0, 0, E), false);
// Scenario 5: threshold verdict flip: threshold 2400, B ts=2000... use numbers:
// B ts elapsed = E-P1 = 2000 >= ... threshold 1500: TS credits, RS (1000) does not.
const tsB = tsElapsed(2000, 1000, undefined, E); // 2000
const rsB = rsElapsed(2000, 2000, E);            // 1000
eq('F verdict flip (thr=1500)', tsB >= 1500, rsB >= 1500, true);
console.log(`battery: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
