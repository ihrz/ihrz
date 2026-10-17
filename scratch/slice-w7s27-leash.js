// W7 slice 27 battery: Events/utils/leashModule.ts decision legs, verbatim.
const EXP = 30 * 60 * 1000;
const now = 1_000_000_000_000;
const valid = (ts) => now - ts <= EXP;
const expired = (ts) => now - ts > EXP;
let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a === b) pass++; else { fail++; console.log(`FAIL ${name}: got ${a} want ${b}`); }
};
// 1. expiry boundary + future + float stamps
eq("exact-boundary-valid", valid(now - EXP), true);
eq("one-ms-over-expired", expired(now - EXP - 1), true);
eq("zero-age-valid", valid(now), true);
eq("future-stamp-valid", valid(now + 60_000), true);
eq("future-stamp-not-expired", expired(now + 60_000), false);
eq("float-stamp-valid", valid(now - EXP + 0.5), true);
eq("nan-neither-valid", valid(NaN), false);
eq("nan-neither-expired", expired(NaN), false);
// 2. prune-write gate: writes iff some row expired (partition => len differs)
const shouldWrite = (rows) => rows.some((ts) => expired(ts));
eq("write-all-valid", shouldWrite([now, now - 1]), false);
eq("write-one-expired", shouldWrite([now, now - EXP - 1]), true);
eq("write-empty", shouldWrite([]), false);
// 3. matchedPairings: whole-string x.sub===id || x.dom===id over old/new ids
const matches = (e, oldId, newId) =>
  e.sub === oldId || e.dom === oldId || e.sub === newId || e.dom === newId;
const multi = { dom: "9", sub: "1,2" };
eq("multi-dom-matches", matches(multi, undefined, "9"), true);
eq("multi-part-never-matches", matches(multi, "1", "1"), false);
eq("multi-csv-literal-match", matches({ dom: "9", sub: "1,2" }, "1,2", "x"), true);
eq("single-sub-matches", matches({ dom: "9", sub: "1" }, undefined, "1"), true);
eq("outsider-misses", matches(multi, "7", "7"), false);
eq("undefined-never-matches", matches({ dom: "9", sub: "1" }, undefined, undefined), false);
// 4. changing = newId || oldId; isDom
const changing = (n, o) => n || o;
eq("changing-prefers-new", changing("A", "B"), "A");
eq("changing-falls-back-old", changing(null, "B"), "B");
eq("isdom-true", changing("9", "9") === "9", true);
eq("isdom-false", changing("1", "1") === "9", false);
// 5. sub CSV resolve: split/trim/drop-miss; continue iff !dom || subs empty
const resolve = (csv, cache) =>
  csv.split(",").map((id) => id.trim()).map((id) => cache[id]).filter((m) => m !== undefined);
eq("csv-trim-drop", resolve("1, 2,,3 ", { 1: "m1", 3: "m3" }), ["m1", "m3"]);
eq("csv-all-miss", resolve("5,6", {}), []);
// 6. direction verdicts: dom&&target -> drag; !isDom&&domCh&&target!==domCh -> pull changer only
const verdict = (isDom, target, domCh) =>
  isDom ? (target ? "drag-subs" : "noop") : domCh && target !== domCh ? "pull-changer" : "noop";
eq("dom-with-target-drags", verdict(true, "C1", "C1"), "drag-subs");
eq("dom-disconnect-noop", verdict(true, null, "C1"), "noop");
eq("sub-away-pulls", verdict(false, "C2", "C1"), "pull-changer");
eq("sub-already-there-noop", verdict(false, "C1", "C1"), "noop");
eq("sub-dom-voiceless-noop", verdict(false, "C2", null), "noop");
eq("sub-disconnect-pulls-back", verdict(false, "C0", "C1"), "pull-changer");
console.log(`leash battery: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
