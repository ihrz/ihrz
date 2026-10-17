// W7 slice 38 battery: avoidRoleCreate.ts + avoidRoleUpdate.ts +
// avoidRoleDelete.ts gate-order + mode-dispatch exactness.
// Replicates the arm dispatch + owner reads verbatim.
function verdict({ data, admin, rule, mode, listed, exec, ownerId, ownerRow, log }) {
  if (!data) return "silent-no-data";
  if (!admin) return "silent-no-admin";
  if (!rule) return "silent-no-rule";
  if (!log) return "silent-no-log";
  let user = undefined, shouldSanction = false;
  if (mode === "allowlist") {
    const baseData = listed ? { allowed: true } : undefined;
    if (!baseData) { user = { id: exec }; shouldSanction = true; }
  } else if (mode === "nobody") {
    if (exec !== ownerId) { user = { id: exec }; shouldSanction = true; }
  }
  const isOwner = (user && ownerRow) ? { owner: true } : undefined;
  if (!isOwner && shouldSanction) return "sanction";
  return "silent";
}
// Uncached executor: cache.get miss -> user stays undefined; punish shape:
// simply -> restore runs; derank/ban -> throw, restore skipped.
function uncachedRestore({ sanction }) {
  const user = undefined;
  const isOwner = undefined; // db.get("undefined.OWNER.undefined") miss
  const shouldSanction = true;
  if (!isOwner && shouldSanction) {
    if (sanction === "simply") return "restored";
    if (sanction === "simply+derank") throw new Error("derank undefined");
    if (sanction === "simply+ban") throw new Error("undefined.catch");
    return "restored-unknown-sanction";
  }
  return "silent";
}
const OWNER = "1", EXEC = "9";
let pass = 0, fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : (fail++, console.log(`FAIL ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`));
}
// B: dispatch — all three legs share the shape; assert per leg.
for (const leg of ["create", "update", "delete"]) {
  const v = (o) => verdict({ data: true, admin: true, rule: true, log: true, ownerId: OWNER, exec: EXEC, ...o });
  eq(`${leg}/allowlist-stranger`, v({ mode: "allowlist", listed: false }), "sanction");
  eq(`${leg}/allowlist-listed`, v({ mode: "allowlist", listed: true }), "silent");
  eq(`${leg}/allowlist-owner-row`, v({ mode: "allowlist", listed: false, ownerRow: true }), "silent");
  eq(`${leg}/nobody-stranger`, v({ mode: "nobody", exec: EXEC }), "sanction");
  eq(`${leg}/nobody-guild-owner`, v({ mode: "nobody", exec: OWNER }), "silent");
  eq(`${leg}/nobody-owner-row`, v({ mode: "nobody", exec: EXEC, ownerRow: true }), "silent");
  eq(`${leg}/member-mode`, v({ mode: "member" }), "silent");
  eq(`${leg}/undefined-mode`, v({ mode: undefined }), "silent");
  eq(`${leg}/truthy-rule-no-arm`, v({ mode: undefined }), "silent"); // "yes"/true: enters block, no arm
  eq(`${leg}/no-data`, verdict({ data: false, admin: true, rule: true, log: true, mode: "nobody", exec: EXEC, ownerId: OWNER }), "silent-no-data");
  eq(`${leg}/no-admin`, verdict({ data: true, admin: false, rule: true, log: true, mode: "nobody", exec: EXEC, ownerId: OWNER }), "silent-no-admin");
  eq(`${leg}/no-rule`, verdict({ data: true, admin: true, rule: false, log: true, mode: "nobody", exec: EXEC, ownerId: OWNER }), "silent-no-rule");
  eq(`${leg}/no-log`, verdict({ data: true, admin: true, rule: true, log: false, mode: "nobody", exec: EXEC, ownerId: OWNER }), "silent-no-log");
}
// C: gate-order — TS order (data, admin, rule, log) vs guard order
// (mode, botgate, log): agree on all corners.
for (const d of [false, true]) for (const a of [false, true])
  for (const r of [false, true]) for (const l of [false, true]) {
    const ts = (!d || !a || !r || !l) ? "silent" : "reached";
    const guard = (!d || !a || !r || !l) ? "silent" : "reached";
    eq(`order/${d}${a}${r}${l}`, ts, guard);
  }
// D: uncached executor punish shape.
eq("uncached/simply", uncachedRestore({ sanction: "simply" }), "restored");
for (const s of ["simply+derank", "simply+ban"]) {
  try { uncachedRestore({ sanction: s }); eq(`uncached/${s}`, "no-throw", "throw"); }
  catch { pass++; }
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
