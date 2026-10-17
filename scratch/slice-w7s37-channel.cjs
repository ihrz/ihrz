// W7 slice 37 battery: channel avoid gate-order + mode-dispatch exactness.
// Replicates avoidChannelCreate.ts (punish OUTSIDE arms), avoidChannelDelete.ts
// (punish OUTSIDE arms), avoidChannelUpdate.ts (punish INSIDE `nobody` arm).
function tsCreateVerdict(rule, allowlisted, isGuildOwner, ownerRow) {
  if (!rule) return false;
  let should = false;
  if (rule.mode === "allowlist") { if (!allowlisted) should = true; }
  else if (rule.mode === "nobody") { if (!isGuildOwner) should = true; }
  else return false;
  return !ownerRow && should;
}
function tsDeleteVerdict(rule, allowlisted, isGuildOwner, ownerRow, cached) {
  if (!rule) return false;
  let should = false, user = false;
  if (rule.mode === "allowlist") { if (!allowlisted) { user = cached; should = true; } }
  else if (rule.mode === "nobody") { if (!isGuildOwner) { user = cached; should = true; } }
  else return false;
  if (!user) return false; // `if (!user) return` inside the IIFE
  return !ownerRow && should;
}
function tsUpdateVerdict(rule, allowlisted, isGuildOwner, ownerRow) {
  if (!rule) return false;
  if (rule.mode === "allowlist") {
    // punish lives in the NOBODY arm only -> dead rule, always silent
    return false;
  } else if (rule.mode === "nobody") {
    let should = false;
    if (!isGuildOwner) should = true;
    return !ownerRow && should;
  }
  return false;
}
const C = [
  // [name, rule, listed, guildOwner, ownerRow, expCreate, expDelete, expUpdate]
  ["allow+listed", { mode: "allowlist" }, true, false, false, false, false, false],
  ["allow+stranger", { mode: "allowlist" }, false, false, false, true, true, false],
  ["allow+stranger+ownerRow", { mode: "allowlist" }, false, false, true, false, false, false],
  ["nobody+stranger", { mode: "nobody" }, false, false, false, true, true, true],
  ["nobody+guildOwner", { mode: "nobody" }, false, true, false, false, false, false],
  ["nobody+stranger+ownerRow", { mode: "nobody" }, false, false, true, false, false, false],
  ["member+stranger", { mode: "member" }, false, false, false, false, false, false],
  ["no-rule", undefined, false, false, false, false, false, false],
];
let fail = 0;
for (const [n, r, l, o, w, ec, ed, eu] of C) {
  const c = tsCreateVerdict(r, l, o, w), d = tsDeleteVerdict(r, l, o, w, true), u = tsUpdateVerdict(r, l, o, w);
  if (c !== ec || d !== ed || u !== eu) { console.log("MISS", n, { c, d, u }); fail++; }
  else console.log("ok", n, `create=${c} delete=${d} update=${u}`);
}
// uncached-executor delete leg: `if (!user) return` skips punish+restore
console.log("uncached-delete:", tsDeleteVerdict({ mode: "nobody" }, false, false, false, false) === false ? "ok silent" : "MISS");
if (fail) { console.error(`FAILURES=${fail}`); process.exit(1); }
console.log("BATTERY GREEN: update/allowlist is a dead rule in TS (always silent); create+delete punish in both modes");
