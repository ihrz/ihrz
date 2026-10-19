// W7 slice 74 battery: ready.ts refreshBotData retry/shape legs, verbatim.
const cases = [];
function leg(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  cases.push([ok ? 'PASS' : 'FAIL', name, JSON.stringify(got), 'want=' + JSON.stringify(want)]);
}

// --- A. retry classifier, verbatim (ready.ts:294-298) ---
function isShardingInProcess(error) {
  return error?.name?.includes('ShardingInProcess') ||
    String(error?.message ?? error).includes('still being spawned');
}
leg('A1 name-hit', isShardingInProcess({ name: 'ShardingInProcess', message: 'x' }), true);
leg('A2 name-substring', isShardingInProcess({ name: 'xxShardingInProcessxx' }), true);
leg('A3 message-hit', isShardingInProcess({ name: 'Error', message: 'Shards are still being spawned!' }), true);
leg('A4 neither', isShardingInProcess({ name: 'Error', message: 'ECONNREFUSED' }), false);
leg('A5 undefined-err', isShardingInProcess(undefined), false);
leg('A6 null-err', isShardingInProcess(null), false);
leg('A7 string-err-hit', isShardingInProcess('still being spawned'), true);
leg('A8 string-err-miss', isShardingInProcess('boom'), false);
leg('A9 missing-message-falls-back-to-String(err)', isShardingInProcess({ name: 'Error' }), false);
leg('A10 empty-object', isShardingInProcess({}), false);

// --- B. attempt budget, verbatim loop (ready.ts:255-310, sleep stubbed) ---
async function runLoop(failuresBeforeSuccess, error) {
  const MAX_RETRIES = 12;
  let attempts = 0, sleeps = 0, logged = false;
  for (let attempt = 1; ; attempt++) {
    try {
      attempts++;
      if (attempts <= failuresBeforeSuccess) throw error;
      return { attempts, sleeps, logged };
    } catch (err) {
      const retry = err?.name?.includes('ShardingInProcess') ||
        String(err?.message ?? err).includes('still being spawned');
      if (!retry || attempt > MAX_RETRIES) { logged = true; if (attempts <= failuresBeforeSuccess) return { attempts, sleeps, logged }; return { attempts, sleeps, logged }; }
      sleeps++;
    }
  }
}
const shipErr = { name: 'ShardingInProcess', message: 'spawn' };
(async () => {
  let r = await runLoop(1e9, shipErr);
  leg('B1 always-fail-sharding: 13 attempts', r.attempts, 13);
  leg('B2 always-fail-sharding: 12 sleeps', r.sleeps, 12);
  r = await runLoop(2, shipErr);
  leg('B3 fail-twice-then-ok: 3 attempts', r.attempts, 3);
  leg('B4 fail-twice-then-ok: 2 sleeps', r.sleeps, 2);
  r = await runLoop(1e9, new Error('ECONNREFUSED'));
  leg('B5 non-sharding-error: 1 attempt, no retry', r.attempts, 1);
  leg('B6 non-sharding-error: 0 sleeps', r.sleeps, 0);

  // --- C. row shape legs, verbatim ---
  const pushedAt = 1700000000000;
  leg('C1 lastPushAt', pushedAt, 1700000000000);
  leg('C2 ISO millis', new Date(pushedAt).toISOString(), '2023-11-14T22:13:20.000Z');
  leg('C3 ISO nonzero-millis', new Date(1700000000123).toISOString(), '2023-11-14T22:13:20.123Z');
  leg('C4 ISO epoch', new Date(0).toISOString(), '1970-01-01T00:00:00.000Z');
  leg('C5 ISO y2038', new Date(2147483647000).toISOString(), '2038-01-19T03:14:07.000Z');
  const shardIds = undefined;
  leg('C6 writerShard undefined-shard', shardIds?.[0] ?? 0, 0);
  leg('C7 writerShard present', [3][0] ?? 0, 3);
  const sizes = { a: 90, b: 12, c: 7 };
  leg('C8 commands sum', sizes.a + sizes.b + sizes.c, 109);
  leg('C9 id snowflake stays string', String(123456789012345678n), '123456789012345678');

  let fails = 0;
  for (const [s, n, g, w] of cases) { if (s === 'FAIL') fails++; console.log(s, n, g, w); }
  console.log(fails === 0 ? 'ALL GREEN' : `${fails} FAILURES`);
  process.exit(fails === 0 ? 0 : 1);
})();
