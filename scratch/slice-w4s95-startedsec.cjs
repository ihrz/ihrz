// W4 slice 95 battery: TS `Math.floor(startedAt / 1000)` (scrobbleTrack
// `timestamp`, updateNowPlaying has no timestamp) vs i64 trunc-div
// `started_ms / 1000`. Non-negative inputs must agree exactly;
// negative inputs (pre-1970, unreachable live: Date.now() > 0) diverge
// by one toward zero, which `div_euclid(1000)` closes.
const tsFloorSec = (ms) => Math.floor(ms / 1000);
const truncSec = (ms) => Math.trunc(ms / 1000);
const euclidSec = (ms) => {
  const r = ((ms % 1000) + 1000) % 1000;
  return (ms - r) / 1000;
};

const cases = [
  0, 1, 999, 1000, 1001, 1700000000000, 1699999999999,
  -1, -500, -999, -1000, -1001, -1500, -1700000000000,
];
let pass = 0, fail = 0;
for (const ms of cases) {
  const ts = tsFloorSec(ms);
  const rs = truncSec(ms);
  const eu = euclidSec(ms);
  const expectDiverge = ms < 0 && ms % 1000 !== 0;
  const didDiverge = ts !== rs;
  const euclidExact = eu === ts;
  const ok = didDiverge === expectDiverge && euclidExact;
  if (ok) pass++; else fail++;
  console.log(`${ok ? "ok" : "FAIL"} ms=${ms} ts=${ts} trunc=${rs} euclid=${eu}`);
}
// Non-negative domain: trunc == floor on every probed leg.
const nonNeg = cases.filter((m) => m >= 0).every((m) => tsFloorSec(m) === truncSec(m));
console.log(`${nonNeg ? "ok" : "FAIL"} non-negative domain trunc==floor`);
if (nonNeg) pass++; else fail++;
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
