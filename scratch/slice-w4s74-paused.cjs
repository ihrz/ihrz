// W4 slice 74 battery: lastFMScrobblerManager.ts handlePlayerUpdate (302-327)
// pause/resume arm exactness, replicated verbatim (no Lavalink/Discord needed).
'use strict';

function makeListener(extra) {
  return {
    pausedDurationMs: 0,
    pausedStartedAt: undefined,
    scrobbled: false,
    timeout: undefined,
    ...extra,
  };
}
function makeSession(listeners, paused) {
  const m = new Map();
  for (const [id, l] of listeners) m.set(id, l);
  return { guildId: 'g', listeners: m, paused };
}
function clearListenerTimeout(l) {
  if (l.timeout) { clearTimeout(l.timeout); l.timeout = undefined; }
}
function scheduleCalls(session) {
  // scheduleScrobble always invoked per listener on resume arm (gates inside)
  return [...session.listeners.keys()];
}
// Verbatim handlePlayerUpdate body (async stripped; returns outcome + schedule list)
function handlePlayerUpdate(sessions, guildId, oldPaused, newPaused, now) {
  const session = sessions.get(guildId);
  if (!session || oldPaused === newPaused) return { r: 'noop', sched: [] };
  session.paused = newPaused;
  if (newPaused) {
    for (const l of session.listeners.values()) {
      clearListenerTimeout(l);
      l.pausedStartedAt = now; // UNCONDITIONAL overwrite
    }
    return { r: 'paused', sched: [] };
  }
  for (const l of session.listeners.values()) {
    if (l.pausedStartedAt) { // truthy check
      l.pausedDurationMs += now - l.pausedStartedAt;
      l.pausedStartedAt = undefined;
    }
  }
  return { r: 'resumed', sched: scheduleCalls(session) };
}
function getElapsed(l, now) {
  const cur = l.pausedStartedAt ? now - l.pausedStartedAt : 0;
  return now - l.startedAt - l.pausedDurationMs - cur;
}

let pass = 0, fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; console.log(`FAIL ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
}

// A: no session -> noop
eq('A1 nosession', handlePlayerUpdate(new Map(), 'g', false, true, 1000).r, 'noop');
// B: unchanged pair -> noop, stamps untouched
{
  const l = makeListener({ pausedStartedAt: 500, startedAt: 0 });
  const s = makeSession([['u', l]], true);
  const m = new Map([['g', s]]);
  eq('B1 noop-true-true', handlePlayerUpdate(m, 'g', true, true, 2000).r, 'noop');
  eq('B2 stamp-kept', l.pausedStartedAt, 500);
  const l2 = makeListener({ startedAt: 0 });
  const s2 = makeSession([['u', l2]], false);
  m.set('g', s2);
  eq('B3 noop-false-false', handlePlayerUpdate(m, 'g', false, false, 2000).r, 'noop');
}
// C: pause arm overwrites every stamp + clears timeout + flips session flag
{
  const l1 = makeListener({ pausedStartedAt: 1000, startedAt: 0, timeout: setTimeout(() => {}, 99999) });
  const l2 = makeListener({ startedAt: 500 });
  const s = makeSession([['a', l1], ['b', l2]], false);
  const m = new Map([['g', s]]);
  const out = handlePlayerUpdate(m, 'g', false, true, 2000);
  eq('C1 outcome', out.r, 'paused');
  eq('C2 overwrite-old-stamp', l1.pausedStartedAt, 2000);
  eq('C3 fresh-stamp', l2.pausedStartedAt, 2000);
  eq('C4 timeout-cleared', l1.timeout, undefined);
  eq('C5 session-flag', s.paused, true);
}
// D: duplicate pause event (old=false,new=true while already paused) re-runs arm, overwrite moves stamp
{
  const l = makeListener({ pausedStartedAt: 2000, startedAt: 0 });
  const s = makeSession([['a', l]], true);
  const m = new Map([['g', s]]);
  const out = handlePlayerUpdate(m, 'g', false, true, 3000);
  eq('D1 dup-pause-reruns', out.r, 'paused');
  eq('D2 stamp-moved-later', l.pausedStartedAt, 3000);
}
// E: resume banks per listener w/ stamp; unstamped untouched; all get schedule; flag flips
{
  const l1 = makeListener({ pausedStartedAt: 2000, startedAt: 0 });
  const l2 = makeListener({ startedAt: 1000, scrobbled: true });
  const s = makeSession([['a', l1], ['b', l2]], true);
  const m = new Map([['g', s]]);
  const out = handlePlayerUpdate(m, 'g', true, false, 5000);
  eq('E1 outcome', out.r, 'resumed');
  eq('E2 banked', l1.pausedDurationMs, 3000);
  eq('E3 stamp-cleared', l1.pausedStartedAt, undefined);
  eq('E4 unstamped-no-bank', l2.pausedDurationMs, 0);
  eq('E5 schedule-all-incl-scrobbled', out.sched, ['a', 'b']);
  eq('E6 session-flag', s.paused, false);
}
// F: falsy-but-present stamp (0) banks nothing (truthy gate)
{
  const l = makeListener({ pausedStartedAt: 0, startedAt: 0 });
  const s = makeSession([['a', l]], true);
  const m = new Map([['g', s]]);
  handlePlayerUpdate(m, 'g', true, false, 5000);
  eq('F1 zero-stamp-no-bank', l.pausedDurationMs, 0);
  eq('F2 zero-stamp-kept', l.pausedStartedAt, 0);
}
// G: elapsed during open pause excludes ongoing leg
{
  const l = makeListener({ pausedStartedAt: 8000, startedAt: 0, pausedDurationMs: 1000 });
  eq('G1 open-pause-elapsed', getElapsed(l, 10000), 7000);
}
// H: full cycle pause->resume elapsed converges to wall-minus-bank
{
  const l = makeListener({ startedAt: 0 });
  const s = makeSession([['a', l]], false);
  const m = new Map([['g', s]]);
  handlePlayerUpdate(m, 'g', false, true, 4000);   // pause at 4s
  handlePlayerUpdate(m, 'g', true, false, 7000);   // resume at 7s (3s pause)
  eq('H1 banked-cycle', l.pausedDurationMs, 3000);
  eq('H2 elapsed-at-10s', getElapsed(l, 10000), 7000);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
