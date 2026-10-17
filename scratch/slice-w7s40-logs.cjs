// W7 slice 40 battery: replicate getLogs (Events/protection/ready.ts) verbatim.
const WINDOW = 20_000;
const BOT = "BOTID";
function findRelevant(entries, target, now) {
  return entries.find((e) =>
    e.targetId === target &&
    e.executorId !== BOT &&
    Boolean(e.executorId) &&
    e.createdTimestamp > now - WINDOW
  );
}
const NOW = 1_000_000;
let pass = 0, fail = 0;
function eq(name, got, want) {
  const a = got === undefined ? "undef" : (got && got.id) || String(got);
  if (a === want) { pass++; }
  else { fail++; console.log(`FAIL ${name}: got ${a}, want ${want}`); }
}
// --- mod_audit_log legs (ban/kick): latest-targets-other ---
// A banned (E1), then B banned (E2 latest). Event for A arrives late.
let entries = [
  { id: "E2", targetId: "B", executorId: "mod2", createdTimestamp: NOW - 1000 },
  { id: "E1", targetId: "A", executorId: "mod1", createdTimestamp: NOW - 5000 },
];
eq("banA-finds-E1", findRelevant(entries, "A", NOW), "E1");
// Rust-first (limit 1) would take E2 -> misattributes A's embed to mod2.
// --- executor-is-bot latest: protection +ban sanction bans raider ---
entries = [{ id: "E3", targetId: "R", executorId: BOT, createdTimestamp: NOW - 1000 }];
eq("bot-executor-skips", findRelevant(entries, "R", NOW), "undef");
// --- stale latest (event lag 25s) ---
entries = [{ id: "E4", targetId: "S", executorId: "mod", createdTimestamp: NOW - 25000 }];
eq("stale-skips", findRelevant(entries, "S", NOW), "undef");
// --- boundary strictness: exactly 20000 -> NOT recent (strict >) ---
entries = [{ id: "E5", targetId: "T", executorId: "mod", createdTimestamp: NOW - 20000 }];
eq("exact-boundary-skips", findRelevant(entries, "T", NOW), "undef");
entries = [{ id: "E6", targetId: "T", executorId: "mod", createdTimestamp: NOW - 19999 }];
eq("inside-boundary-finds", findRelevant(entries, "T", NOW), "E6");
// --- channel legs: either-proceeds gate ---
function chanProceeds(r1, r2) {
  if (!r1 && !r2) return false;
  if ((r1 && r1.executorId) === BOT && (r2 && r2.executorId) === BOT) return false;
  return true;
}
const chE = { id: "C1", targetId: "CH", executorId: "mod", createdTimestamp: NOW - 1000 };
eq("chan-only-update-proceeds", chanProceeds(chE, undefined), "true");
eq("chan-only-overwrite-proceeds", chanProceeds(undefined, chE), "true");
eq("chan-neither-skips", chanProceeds(undefined, undefined), "false");
eq("chan-both-bot-skips", chanProceeds(
  { ...chE, executorId: BOT }, { ...chE, id: "C2", executorId: BOT }), "false");
eq("chan-one-bot-one-missing-proceeds", chanProceeds(
  { ...chE, executorId: BOT }, undefined), "true");
// --- roles legs: latest-targets-other, older matches ---
entries = [
  { id: "R2", targetId: "Y", executorId: "mod", createdTimestamp: NOW - 1000 },
  { id: "R1", targetId: "X", executorId: "mod", createdTimestamp: NOW - 2000 },
];
eq("rolesX-finds-R1", findRelevant(entries, "X", NOW), "R1");
// --- LOGS-set dedup: same entry consumed twice -> second undefined ---
const logSet = new Set();
function findOnce(entries, target, now) {
  const r = findRelevant(entries, target, now);
  if (!r) return undefined;
  if (logSet.has(r.id)) return undefined;
  logSet.add(r.id);
  return r;
}
entries = [{ id: "D1", targetId: "Z", executorId: "mod", createdTimestamp: NOW - 1000 }];
eq("dedup-first", findOnce(entries, "Z", NOW), "D1");
eq("dedup-second", findOnce(entries, "Z", NOW), "undef");
console.log(`battery: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
