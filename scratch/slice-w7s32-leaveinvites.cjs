// W7 slice 32 battery: verbatim replica of the leaveMessage.ts
// inviter-accounting legs + {invitesCount} render (method.ts:1111-1112).
// In-memory db mimics the json/memory driver addSubtract/get/set.
const store = new Map();
function deepGet(root, parts) {
  let cur = root;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur === undefined ? undefined : structuredClone(cur);
}
function deepSet(root, parts, val) {
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = structuredClone(val);
}
const splitKey = (k) => k.split('.');
const db = {
  get: async (k) => (store.has(splitKey(k)[0]) ? deepGet(store.get(splitKey(k)[0]), splitKey(k).slice(1)) : undefined),
  set: async (k, v) => {
    const p = splitKey(k);
    if (!store.has(p[0])) store.set(p[0], {});
    deepSet(store.get(p[0]), p.slice(1), v);
    return v;
  },
  addSubtract: async (k, v, sub = false) => {
    const p = splitKey(k);
    if (!store.has(p[0])) store.set(p[0], {});
    let cur = deepGet(store.get(p[0]), p.slice(1));
    if (cur == null) cur = 0;
    if (typeof cur !== 'number') cur = parseFloat(cur);
    let val = v;
    if (typeof val !== 'number') val = parseFloat(val);
    sub ? (cur -= val) : (cur += val);
    deepSet(store.get(p[0]), p.slice(1), cur);
    return cur;
  },
  add: function (k, v) { return this.addSubtract(k, v); },
  sub: function (k, v) { return this.addSubtract(k, v, true); },
};
const G = 'g1', L = 'leaver1', I = 'inv42';
const byKey = `${G}.USER.${L}.INVITES.BY`;
const rowKey = `${G}.USER.${I}.INVITES`;
const invKey = `${G}.USER.${I}.INVITES.invites`;

// ---- verbatim TS legs ----
async function tsLeave(base) {
  if (base?.inviter) {
    const inviterStats = await db.get(`${G}.USER.${base.inviter}.INVITES`);
    if (inviterStats) {
      if (inviterStats?.invites && inviterStats.invites >= 1) {
        await db.sub(`${G}.USER.${base.inviter}.INVITES.invites`, 1);
      }
      await db.add(`${G}.USER.${base.inviter}.INVITES.leaves`, 1);
    }
    const invitesAmount = await db.get(`${G}.USER.${base.inviter}.INVITES.invites`);
    return invitesAmount;
  }
  return 'NO-BASE';
}
const renderCount = (a) => a?.toString() || '1337';

const results = [];
async function leg(name, base, seedRow, wantRow, wantAmount, wantRendered) {
  store.clear();
  if (seedRow !== undefined) await db.set(rowKey, structuredClone(seedRow));
  const amount = await tsLeave(base);
  const row = await db.get(rowKey);
  const rendered = amount === 'NO-BASE' ? 'n/a' : renderCount(amount);
  const okRow = JSON.stringify(row) === JSON.stringify(wantRow);
  const okAmt = (amount === wantAmount) || (Number.isNaN(amount) && Number.isNaN(wantAmount));
  const okRen = rendered === wantRendered;
  results.push({ name, ok: okRow && okAmt && okRen, row, wantRow, amount, wantAmount, rendered });
}

(async () => {
  await leg('no-base', undefined, undefined, undefined, 'NO-BASE', 'n/a');
  await leg('no-row', { inviter: I }, undefined, undefined, undefined, '1337');
  await leg('inv5', { inviter: I }, { invites: 5, regular: 5, bonus: 0, leaves: 2 },
    { invites: 4, regular: 5, bonus: 0, leaves: 3 }, 4, '4');
  await leg('inv1', { inviter: I }, { invites: 1, regular: 0, bonus: 1, leaves: 0 },
    { invites: 0, regular: 0, bonus: 1, leaves: 1 }, 0, '0');
  await leg('inv0', { inviter: I }, { invites: 0, regular: 0, bonus: 0, leaves: 7 },
    { invites: 0, regular: 0, bonus: 0, leaves: 8 }, 0, '0');
  await leg('inv-neg', { inviter: I }, { invites: -3, regular: 0, bonus: -3, leaves: 1 },
    { invites: -3, regular: 0, bonus: -3, leaves: 2 }, -3, '-3');
  await leg('no-invites-key', { inviter: I }, { leaves: 2 },
    { leaves: 3 }, undefined, '1337');
  await leg('no-leaves-key', { inviter: I }, { invites: 2 },
    { invites: 1, leaves: 1 }, 1, '1');
  await leg('empty-row', { inviter: I }, {}, { leaves: 1 }, undefined, '1337');
  await leg('big', { inviter: I }, { invites: 100, regular: 100, bonus: 0, leaves: 0 },
    { invites: 99, regular: 100, bonus: 0, leaves: 1 }, 99, '99');
  let pass = 0;
  for (const r of results) {
    if (r.ok) pass++;
    else console.log('FAIL', r.name, JSON.stringify({ row: r.row, wantRow: r.wantRow, amount: String(r.amount), wantAmount: String(r.wantAmount), rendered: r.rendered }));
  }
  console.log(`${pass}/${results.length} legs pass`);
  if (pass !== results.length) process.exit(1);
})();
