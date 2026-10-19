// W7 slice 73 battery: ready.ts refresh legs ground truth.
// Replicates verbatim: (A) `array.value[ScheduleId]?.expired <= dateNow`
// (B) `currentTime - ts <= 30*24*60*60*1000` (C) shared-`desc`
// accumulation across expired entries (D) refreshDatabaseModel per-owner
// cache-or-fetch/delete outcomes (E) quotesPresence dead `return`.
const NOW = 1_700_000_000_000;
const RET = 30 * 24 * 60 * 60 * 1000;
let pass = 0, fail = 0;
function eq(name, actual, expected) {
  const ok = actual === expected;
  ok ? pass++ : fail++;
  if (!ok) console.log(`FAIL ${name}: got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`);
}
// A: expired gate
const gate = (v) => v?.expired <= NOW;
eq('A1 missing-entry', gate(undefined), false);
eq('A2 null-entry', gate(null), false);
eq('A3 empty-row', gate({}), false);
eq('A4 undefined-expired', gate({ expired: undefined }), false);
eq('A5 null-expired-fires', gate({ expired: null }), true); // null->0 coercion
eq('A6 zero-fires', gate({ expired: 0 }), true);
eq('A7 equal-fires', gate({ expired: NOW }), true);
eq('A8 future-silent', gate({ expired: NOW + 1 }), false);
eq('A9 numeric-string-fires', gate({ expired: '1699999999999' }), true);
eq('A10 junk-string-silent', gate({ expired: 'abc' }), false);
eq('A11 float-fires', gate({ expired: 5.5 }), true);
eq('A12 true-coerces-fires', gate({ expired: true }), true);
// B: retention filter
const keep = (ts) => NOW - ts <= RET;
eq('B1 exact-boundary-kept', keep(NOW - RET), true);
eq('B2 one-past-dropped', keep(NOW - RET - 1), false);
eq('B3 future-kept', keep(NOW + 999), true);
eq('B4 epoch-dropped', keep(0), false);
eq('B5 undefined-dropped', keep(undefined), false); // NaN <= x is false
// C: desc accumulation (shared `let desc` outside loops)
function runRefresh(rows) {
  let desc = '';
  const embeds = [];
  for (const e of rows) {
    if (e?.expired <= NOW) {
      desc += `${e.expired}`;
      desc += `\`\`\`${e.title}\`\`\``;
      desc += `\`\`\`${e.description}\`\`\``;
      embeds.push({ title: `#${e.code} Schedule has been expired!`, description: desc });
    }
  }
  return embeds;
}
const out = runRefresh([
  { code: 'A', expired: 1, title: 't1', description: 'd1' },
  { code: 'B', expired: 2, title: 't2', description: 'd2' },
]);
eq('C1 two-embeds', out.length, 2);
eq('C2 second-repeats-first', out[1].description.includes('t1') && out[1].description.includes('t2'), true);
eq('C3 first-clean', out[0].description.includes('t2'), false);
// D: per-owner outcomes (cache.get(id) || fetch(id) -> set; throw -> delete)
async function ownerOutcome(cache, fetch, id, ops) {
  try {
    const user = cache.get(id) || (await fetch(id));
    if (user) { ops.set(id); return 'set'; }
    return 'noop';
  } catch { ops.delete(id); return 'delete'; }
}
const ops = { sets: [], dels: [], set(i) { this.sets.push(i); }, delete(i) { this.dels.push(i); } };
async function main() {
const r = await Promise.all([
  ownerOutcome(new Map([['1', { id: '1' }]]), async () => { throw new Error('unreached'); }, '1', ops),
  ownerOutcome(new Map(), async () => ({ id: '2' }), '2', ops),
  ownerOutcome(new Map(), async () => { throw new Error('gone'); }, '3', ops),
  ownerOutcome(new Map(), async () => null, '4', ops),
]);
eq('D1 cache-hit-set', r[0], 'set');
eq('D2 fetch-ok-set', r[1], 'set');
eq('D3 fetch-throw-delete', r[2], 'delete');
eq('D4 null-user-noop', r[3], 'noop');
// E: quotesPresence body is bare `return;` (rest commented)
const fs = await import('node:fs');
const src = fs.readFileSync('src/Events/client/ready.ts', 'utf8');
const qp = src.slice(src.indexOf('async function quotesPresence'));
const qpBody = qp.slice(qp.indexOf('{'), qp.indexOf('\n\t\t}\n\n\t\tasync function refreshSchedule'));
const stripped = qpBody.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
eq('E1 dead-return', /return\s*;/.test(stripped), true);
eq('E2 no-live-tokens', !/(setPresence|getShardStats|await)/.test(stripped), true);
console.log(`slice-w7s73: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
}
main();
