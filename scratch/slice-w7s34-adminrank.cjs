// W7 slice 34 battery: src/Events/protection/avoidAdminRankWithoutConsent.ts
// Replicates the $add extraction + Administrator-bit filter verbatim,
// plus a replica of the Rust live-site logic (before/after admin-set
// comparison) to prove convergence on reachable legs.
'use strict';

const ADMIN = true;
// adminOf: id -> true(admin) | false(non-admin) | null(fetch fails, role deleted)
function tsDetect(changes, adminOf) {
  // NOTE: `changes.filter` throws when changes is undefined (leg T15).
  let search_for_a_add = changes.filter((x) => x.key === "$add");
  if (!search_for_a_add) return { verdict: "dead-guard" }; // provably dead: filter always returns an array
  let all_roles_added = search_for_a_add.flatMap((x) => x.new ?? []).filter(Boolean);
  let fetched = [];
  for (let role of all_roles_added) {
    const a = adminOf(role.id);
    if (a !== null && a !== undefined) fetched.push({ id: role.id, admin: a });
  }
  let filtered_admin_role = fetched.filter((x) => x.admin === ADMIN);
  if (!filtered_admin_role || filtered_admin_role.length === 0) return { verdict: "no-admin", roles: [] };
  return { verdict: "sanction", roles: filtered_admin_role.map((r) => r.id) };
}

// Rust live-site replica: admin_grant_new_admin_ids(before, after, is_admin)
function rsDetect(before, after, adminOf) {
  const out = [...new Set(after.filter((r) => !before.includes(r) && adminOf(r) === true))].sort();
  return out.length === 0 ? { verdict: "no-admin", roles: [] } : { verdict: "sanction", roles: out };
}

const A = "111"; // admin role
const N = "222"; // non-admin role
const D = "333"; // deleted role (fetch fails)
const adminOf = (id) => (id === A ? true : id === N ? false : id === D ? null : false);

let pass = 0, fail = 0;
function leg(name, changes, before, after, expectTs, expectRs) {
  let ts;
  try {
    ts = tsDetect(changes, adminOf);
  } catch (e) {
    ts = { verdict: "throw", roles: [] };
  }
  const rs = rsDetect(before, after, adminOf);
  const okTs = ts.verdict === expectTs;
  const okRs = rs.verdict === expectRs;
  if (okTs && okRs) { pass++; }
  else { fail++; console.log(`FAIL ${name}: ts=${JSON.stringify(ts)} (want ${expectTs}) rs=${JSON.stringify(rs)} (want ${expectRs})`); }
}

// Reachable legs (both sides must agree)
leg("T1 single-$add-admin", [{ key: "$add", new: [{ id: A }] }], [], [A], "sanction", "sanction");
leg("T2 single-$add-nonadmin", [{ key: "$add", new: [{ id: N }] }], [], [N], "no-admin", "no-admin");
leg("T3 phone-two-$add-entries", [{ key: "$add", new: [{ id: A }] }, { key: "$add", new: [{ id: N }] }], [], [A, N], "sanction", "sanction");
leg("T4 phone-multi-in-one-entry", [{ key: "$add", new: [{ id: N }, { id: A }] }], [], [N, A], "sanction", "sanction");
leg("T5 remove-only", [{ key: "$remove", new: [{ id: A }] }], [A], [], "no-admin", "no-admin");
leg("T6 empty-changes", [], [A], [A], "no-admin", "no-admin");
leg("T7 $add-new-null", [{ key: "$add", new: null }], [], [], "no-admin", "no-admin");
leg("T8 $add-new-undefined", [{ key: "$add" }], [], [], "no-admin", "no-admin");
leg("T9 $add-new-with-null-entry", [{ key: "$add", new: [null, { id: A }] }], [], [A], "sanction", "sanction");
leg("T10 $add-deleted-role", [{ key: "$add", new: [{ id: D }] }], [], [D], "no-admin", "no-admin");
leg("T11 deleted-admin-plus-live-nonadmin", [{ key: "$add", new: [{ id: D }, { id: N }] }], [], [D, N], "no-admin", "no-admin");
leg("T12 wrong-case-key", [{ key: "$Add", new: [{ id: A }] }], [], [A], "no-admin", "sanction"); // EXPECTED DIVERGENCE (delta c2): audit key casing is Discord-fixed "$add"; manual audit shaping only
leg("T13 admin-only-in-$remove", [{ key: "$remove", new: [{ id: A }] }, { key: "$add", new: [{ id: N }] }], [A], [A, N], "no-admin", "no-admin");
leg("T14 dup-$add-same-admin", [{ key: "$add", new: [{ id: A }, { id: A }] }], [], [A], "sanction", "sanction");
leg("T15 changes-undefined-throws", undefined, [], [A], "throw", "sanction"); // EXPECTED DIVERGENCE (delta c1): TS throws (no sanction), Rust sanctions
leg("T16 $add-new-empty", [{ key: "$add", new: [] }], [], [], "no-admin", "no-admin");
leg("T17 all-fetch-fail", [{ key: "$add", new: [{ id: D }] }], [], [], "no-admin", "no-admin");
leg("T18 unrelated-key", [{ key: "nick", new: "x" }], [], [], "no-admin", "no-admin");
leg("T19 preexisting-admin-plus-new-nonadmin", [{ key: "$add", new: [{ id: N }] }], [A], [A, N], "no-admin", "no-admin");
leg("T20 preexisting-admin-plus-new-admin", [{ key: "$add", new: [{ id: A }] }], [N], [N, A], "sanction", "sanction");
// T21: admin granted then removed before the event snapshot (audit lag)
leg("T21 add-then-remove-audit-lag", [{ key: "$add", new: [{ id: A }] }], [], [], "sanction", "no-admin"); // EXPECTED DIVERGENCE (delta c3)

console.log(`\n${pass} passed, ${fail} failed (T12/T15/T21 are documented expected divergences, counted in legs only when matching their declared verdicts)`);
process.exit(fail ? 1 : 0);
