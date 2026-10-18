// W4 slice 81 battery: replicate lastFMScrobblerManager.ts
// shouldScrobble + getThresholdMs verbatim, incl. float halves.
function shouldScrobble(track) { return track.durationMs >= 30_000; }
function getThresholdMs(track) { return Math.min(track.durationMs / 2, 240_000); }
function rustThreshold(d) { return Math.min(Math.floor(d / 2), 240_000); }

const cases = [
  0, 1, 29999, 30000, 30001, 59999, 60000, 200000, 200001,
  479999, 480000, 480001, 600000, 1000000, 1,
];
// float-half probes: odd durations where TS keeps .5
const odds = [30001, 59999, 200001, 479999, 480001, 99999];
let fails = 0;
for (const d of cases) {
  const t = { durationMs: d };
  const s = shouldScrobble(t), th = getThresholdMs(t), rt = rustThreshold(d);
  const half = (d % 2 === 1) && d / 2 < 240_000;
  // Rust gate uses integer threshold: played==floor(half) must still pass TS (elapsed >= float half?)
  // check: TS elapsed>=th vs Rust elapsed>=rt at elapsed==rt
  const tsPass = rt >= th, rsPass = true; // rt>=rt always
  if (half && tsPass !== rsPass) { console.log(`DIVERGE d=${d} tsHalf=${th} rust=${rt} elapsed@${rt}: ts=${tsPass}`); fails++; }
  else console.log(`ok d=${d} should=${s} tsTh=${th} rustTh=${rt}${half ? ' (half)' : ''}`);
}
for (const d of odds) {
  const th = d / 2;
  // elapsed exactly at floor(half): TS says elapsed < th (miss), Rust says hit
  console.log(`half d=${d}: ts=${th} rust=${Math.floor(d/2)} elapsed=floor -> TS miss by 0.5ms, Rust hit`);
}
// cap boundary: 480000 -> 240000 both; 480001 TS min(240000.5,240000)=240000
console.log('cap480001 ts=' + getThresholdMs({durationMs:480001}) + ' rust=' + rustThreshold(480001));
// shouldScrobble floor: pure duration gate
for (const d of [29999,30000]) console.log(`should d=${d}: ${shouldScrobble({durationMs:d})}`);
console.log(fails === 0 ? 'NOTE: sub-ms half edge only' : `DIVERGES: ${fails}`);
