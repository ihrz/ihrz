// W7 slice 47 battery: replicates src/Events/logs/boostLogs.ts gates verbatim.
const MAX = 10 * 60 * 1000;
const NOW = 1_700_000_000_000;

// Returns 'Add' | 'Sub' | null (null = silent). Channel/lang omitted (no gate).
function tsBoost(oldMs, newMs, hasBoosterRole) {
  const isRecentBoost = newMs !== null && NOW - newMs <= MAX;
  if (oldMs === newMs) return null;      // :49 strict ===
  if (!hasBoosterRole) return null;      // :53 premiumSubscriberRole
  if (!oldMs && newMs && isRecentBoost) return 'Add'; // :74 falsy old
  if (oldMs && !newMs) return 'Sub';                 // :89 truthy old
  return null;
}

const cases = [
  // [old, new, role, expected, label]
  [null, null, true, null, 'both null equal'],
  [1000, 1000, true, null, 'equal timestamps'],
  [null, NOW, true, 'Add', 'fresh boost'],
  [null, NOW - MAX, true, 'Add', 'recency boundary inclusive'],
  [null, NOW - MAX - 1, true, null, 'stale boost silent'],
  [5000, null, true, 'Sub', 'unboost'],
  [5000, 6000, true, null, 're-boost refresh silent'],
  [null, NOW, false, null, 'add-shape but no booster role'],
  [5000, null, false, null, 'sub-shape but no booster role'],
  [null, null, false, null, 'equal + no role'],
  [null, NOW - 1, true, 'Add', 'just-boosted'],
  [NOW - 100, null, true, 'Sub', 'old recent, new null'],
  [null, NOW + 5000, true, 'Add', 'future timestamp (clock skew) recent'],
  [0, NOW, true, 'Add', 'falsy-zero old reads as missing'],
];

let fail = 0;
for (const [o, n, r, exp, label] of cases) {
  const got = tsBoost(o, n, r);
  const ok = got === exp;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got=${got} want=${exp}`);
}
// count leg: premiumSubscriptionCount?.toString()!
console.log('count-undefined ->', `${undefined?.toString()}`);
console.log(`TOTAL ${cases.length} cases, ${fail} failures`);
process.exit(fail ? 1 : 0);
