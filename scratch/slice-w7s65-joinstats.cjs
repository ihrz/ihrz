// W7 slice 65 battery: joinMessage.ts recordInviterStats + recordStatsOnce +
// findInvite uses-leg, replicated verbatim (sqlite driver addSubtract included).
const assert = require('node:assert');

// ---- faithful model of sqlite.ts get/add/set over nested dot paths ----
function getPath(db, key) {
  const parts = key.split('.');
  let cur = db;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return null;
    cur = cur[p];
  }
  return cur === undefined ? null : cur;
}
function setPath(db, key, val) {
  const parts = key.split('.');
  let cur = db;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = val;
}
// verbatim sqlite.ts addSubtract (parseFloat never throws -> NaN sticks)
function tsAdd(db, key, v) {
  let cur = getPath(db, key);
  if (cur == null) cur = 0;
  if (typeof cur !== 'number') cur = parseFloat(cur);
  if (typeof v !== 'number') v = parseFloat(v);
  cur = cur + v;
  setPath(db, key, cur);
  return cur;
}
// verbatim recordInviterStats
function tsRecord(db, gid, inviterId, memberId, code) {
  const check = getPath(db, `${gid}.USER.${inviterId}.INVITES`);
  if (!check) {
    setPath(db, `${gid}.USER.${inviterId}.INVITES`, { regular: 0, bonus: 0, leaves: 0, invites: 0 });
  }
  tsAdd(db, `${gid}.USER.${inviterId}.INVITES.regular`, 1);
  tsAdd(db, `${gid}.USER.${inviterId}.INVITES.invites`, 1);
  setPath(db, `${gid}.USER.${memberId}.INVITES.BY`, { inviter: inviterId, invite: code });
}
// verbatim recordStatsOnce guard
function tsGuard(statsRecorded, resolved) {
  if (statsRecorded || !resolved?.inviterId) return false;
  return true;
}
// verbatim find uses-leg
function tsFindUses(uses, oldUses) {
  return !!(uses && uses > (oldUses || 0));
}
// ---- Rust model: load (serde defaults, whole-row fail -> zeros) +1/+1, 4-key save ----
function rsLoad(raw) {
  const z = { invites: 0, regular: 0, bonus: 0, leaves: 0 };
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return { ...z };
  for (const k of Object.keys(z)) {
    if (!Number.isInteger(raw[k])) return { ...z }; // from_value whole-row fail
  }
  return { invites: raw.invites ?? 0, regular: raw.regular ?? 0, bonus: raw.bonus ?? 0, leaves: raw.leaves ?? 0 };
}
function rsJoin(raw) {
  const s = rsLoad(raw);
  return { invites: s.invites + 1, regular: s.regular + 1, bonus: s.bonus, leaves: s.leaves };
}

let n = 0;
function eq(a, b, label) {
  n++;
  assert.deepStrictEqual(a, b, label);
}

// J1: missing row -> zero-fill then +1/+1
{
  const db = {};
  tsRecord(db, 'g', '10', '20', 'abc');
  eq(db.g.USER['10'].INVITES, { regular: 1, bonus: 0, leaves: 0, invites: 1 }, 'J1 ts row');
  eq(rsJoin(undefined), { invites: 1, regular: 1, bonus: 0, leaves: 0 }, 'J1 rs row');
  eq(db.g.USER['20'].INVITES.BY, { inviter: '10', invite: 'abc' }, 'J1 ts BY shape');
}
// J2: full row increments, others kept
{
  const db = { g: { USER: { '10': { INVITES: { regular: 4, bonus: 2, leaves: 1, invites: 4 } } } } };
  tsRecord(db, 'g', '10', '20', 'abc');
  eq(db.g.USER['10'].INVITES, { regular: 5, bonus: 2, leaves: 1, invites: 5 }, 'J2 ts row');
  eq(rsJoin({ regular: 4, bonus: 2, leaves: 1, invites: 4 }), { invites: 5, regular: 5, bonus: 2, leaves: 1 }, 'J2 rs row');
}
// J3: {} truthy -> no fill; adds create sub-keys; bonus/leaves stay missing (TS) vs explicit 0 (Rust) -> observably same counts
{
  const db = { g: { USER: { '10': { INVITES: {} } } } };
  tsRecord(db, 'g', '10', '20', 'abc');
  eq(db.g.USER['10'].INVITES.regular, 1, 'J3 ts regular');
  eq(db.g.USER['10'].INVITES.invites, 1, 'J3 ts invites');
  eq('bonus' in db.g.USER['10'].INVITES, false, 'J3 ts bonus stays missing');
  const r = rsJoin({});
  eq([r.regular, r.invites], [1, 1], 'J3 rs counts');
}
// J4: falsy stored rows (0/""/false) -> zero-filled like missing
for (const falsy of [0, '', false]) {
  const db = { g: { USER: { '10': { INVITES: falsy } } } };
  tsRecord(db, 'g', '10', '20', 'abc');
  eq(db.g.USER['10'].INVITES, { regular: 1, bonus: 0, leaves: 0, invites: 1 }, `J4 ts falsy ${JSON.stringify(falsy)}`);
  eq(rsJoin(falsy), { invites: 1, regular: 1, bonus: 0, leaves: 0 }, `J4 rs falsy ${JSON.stringify(falsy)}`);
}
// J5: null sub-keys -> 0 -> 1 both sides
{
  const db = { g: { USER: { '10': { INVITES: { regular: null, bonus: 0, leaves: 0, invites: null } } } } };
  tsRecord(db, 'g', '10', '20', 'abc');
  eq([db.g.USER['10'].INVITES.regular, db.g.USER['10'].INVITES.invites], [1, 1], 'J5 ts null subs');
  eq([rsJoin({ regular: null, bonus: 0, leaves: 0, invites: null }).regular], [1], 'J5 rs null subs');
}
// J6: guard legs
eq(tsGuard(false, { inviterId: '10' }), true, 'J6 proceeds');
eq(tsGuard(true, { inviterId: '10' }), false, 'J6 once-only');
eq(tsGuard(false, { inviterId: undefined }), false, 'J6 no inviter');
eq(tsGuard(false, null), false, 'J6 null resolved');
// J7: uses find-leg truth table
eq(tsFindUses(3, 2), true, 'J7 increase');
eq(tsFindUses(2, 2), false, 'J7 equal');
eq(tsFindUses(0, 0), false, 'J7 zero uses');
eq(tsFindUses(undefined, 0), false, 'J7 undef uses');
eq(tsFindUses(5, undefined), true, 'J7 cache miss');
eq(tsFindUses(1, 4), false, 'J7 decrease');

console.log(`green ${n}/${n} (divergence probes below are doc-deltas, asserted separately)`);
// D1: numeric-string subs: TS parseFloat ("5"->6), Rust whole-row default (->1). Manual-DB-only.
{
  const db = { g: { USER: { '10': { INVITES: { regular: '5', bonus: 0, leaves: 0, invites: '5' } } } } };
  tsRecord(db, 'g', '10', '20', 'abc');
  assert.strictEqual(db.g.USER['10'].INVITES.regular, 6, 'D1 ts parses strings');
  assert.strictEqual(rsJoin({ regular: '5', bonus: 0, leaves: 0, invites: '5' }).regular, 1, 'D1 rs folds');
  console.log('D1 confirmed: string-numeric subs diverge (TS 6 vs Rust 1), manual-DB-only');
}
// D2: extra keys: TS preserves, Rust 4-key save drops. Manual-DB-only.
{
  const db = { g: { USER: { '10': { INVITES: { regular: 1, bonus: 0, leaves: 0, invites: 1, custom: 9 } } } } };
  tsRecord(db, 'g', '10', '20', 'abc');
  assert.strictEqual(db.g.USER['10'].INVITES.custom, 9, 'D2 ts keeps extras');
  console.log('D2 confirmed: extra keys kept by TS, dropped by Rust 4-key save');
}
