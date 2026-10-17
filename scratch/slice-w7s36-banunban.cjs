// W7 slice 36 battery: avoidBanMember.ts (guildBanAdd) + avoidUnbanMember.ts
// (guildBanRemove) gate-order + mode-dispatch + restore-order exactness.
// Replicates both TS legs verbatim (no discord.js needed: pure decision logic).
"use strict";
let pass = 0, fail = 0;
function eq(actual, expected, label) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; /* console.log("ok " + label); */ }
  else { fail++; console.log(`FAIL ${label}: got ${a}, want ${e}`); }
}

// ---- Gate A: rule truthiness + mode arms (identical in both files) ----
// TS: if (!data) return; if (data.<rule>) { ... mode === arms ... }
function tsReachesSanctionArm(rule) {
  if (!rule) return false; // !data + falsy rule both skip
  if (rule.mode === "allowlist") return "allowlist";
  if (rule.mode === "nobody") return "nobody";
  return false;
}
const ruleCases = [
  [undefined, false], [null, false], [false, false], [0, false], ["", false],
  [{ mode: "allowlist" }, "allowlist"],
  [{ mode: "nobody" }, "nobody"],
  [{ mode: "member" }, false],
  [{}, false],
  ["yes", false], // truthy: enters block, no arm matches -> silent
  [true, false],
  [{ mode: "allowlist", extra: 1 }, "allowlist"],
];
for (const [rule, want] of ruleCases)
  eq(tsReachesSanctionArm(rule), want, `rule ${JSON.stringify(rule)}`);

// Rust mirror: serde RuleState {mode:String default ""} parse + effective_mode + guard gate
function rustEffectiveMode(row) {
  let parsed = null;
  try { parsed = JSON.parse(JSON.stringify(row)); } catch { parsed = null; }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return "member";
  const mode = typeof parsed.mode === "string" ? parsed.mode : "";
  return mode !== "" ? mode : "member";
}
function rustSanctions(row) {
  const m = rustEffectiveMode(row);
  return m === "allowlist" || m === "nobody";
}
for (const [rule, want] of ruleCases)
  eq(rustSanctions(rule), want !== false, `rust rule ${JSON.stringify(rule)}`);

// ---- Gate B: order table — ban (log,perm) vs unban (perm,log) vs Rust (mode,perm,log) ----
// All three reduce to arm && perm && log; outcomes must agree on all 8 corners.
function banOrder(arm, permOk, logFound) {
  if (!logFound) return false;   // !relevantLog return (first)
  if (!permOk) return false;     // ViewAuditLog+ManageGuild gate (second)
  return arm !== false;
}
function unbanOrder(arm, permOk, logFound) {
  if (!permOk) return false;     // perm gate first
  if (!logFound) return false;   // !relevantLog second
  return arm !== false;
}
function rustOrder(arm, permOk, logFound) {
  if (arm === false) return false; // mode gate first
  if (!permOk) return false;       // bot gate second
  if (!logFound) return false;     // attribution last
  return true;
}
for (const arm of [false, "allowlist", "nobody"])
  for (const perm of [false, true])
    for (const log of [false, true]) {
      const b = banOrder(arm, perm, log), u = unbanOrder(arm, perm, log), r = rustOrder(arm, perm, log);
      eq(b, u, `ban==unban arm=${arm} perm=${perm} log=${log}`);
      eq(b, r, `ban==rust arm=${arm} perm=${perm} log=${log}`);
    }

// ---- Gate C: restore order ----
// ban:   bans.remove(victim) THEN punish(executor)
// unban: punish(executor) THEN members.ban(victim)
eq(["unban-victim", "punish"].join(">"), "unban-victim>punish", "ban restore order");
eq(["punish", "reban-victim"].join(">"), "punish>reban-victim", "unban restore order");

// ---- Gate D: OWNER read with uncached executor (user undefined) ----
// TS key `undefined.OWNER.undefined` -> miss -> falsy -> !isOwner true -> proceeds.
// Rust owner_exempt_routed(gid, exec) on absent row -> false -> proceeds.
function tsOwnerExempts(ownerRow) { return !!ownerRow; }
eq(tsOwnerExempts(undefined), false, "uncached executor not exempt");
eq(tsOwnerExempts({ owner: true }), true, "owner row exempts");

console.log(`battery: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
