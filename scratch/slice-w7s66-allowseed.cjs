// W7 slice 66 battery: protection/createAllowlistOnMessage.ts lazy-seed legs.
// Replicates the run fn verbatim (guards + !baseData + Object.values(list||{}).
// length===0 + whole-node seed shape incl. ownerId interpolation).
'use strict';
const assert = require('node:assert');

let store = new Map(); // `${guildId}.ALLOWLIST` -> value
let reads = 0, writes = [];

function makeClient() {
  return {
    db: {
      get: async (k) => { reads++; return store.has(k) ? store.get(k) : null; },
      set: async (k, v) => { writes.push([k, v]); store.set(k, v); },
    },
  };
}

// verbatim run fn (stripped of types)
async function run(client, message) {
  if (!message.guild || message.author.bot || !message.channel) return 'early';
  const baseData = await client.db.get(`${message.guildId}.ALLOWLIST`);
  if (!baseData || Object.values(baseData?.list || {}).length === 0) {
    await client.db.set(`${message.guildId}.ALLOWLIST`, {
      enable: false,
      list: { [`${message.guild?.ownerId}`]: { allowed: true } },
    });
    return 'seeded';
  }
  return 'kept';
}

function msg(over = {}) {
  return {
    guild: { id: 'g1', ownerId: 'owner9' },
    guildId: 'g1',
    author: { bot: false },
    channel: { id: 'c1' },
    ...over,
  };
}

(async () => {
  let n = 0;
  const t = async (name, setup, message, expect, expectWrites) => {
    store = new Map(); reads = 0; writes = [];
    if (setup !== undefined) store.set('g1.ALLOWLIST', setup);
    const r = await run(makeClient(), message ?? msg());
    assert.strictEqual(r, expect, `${name}: verdict`);
    assert.strictEqual(writes.length, expectWrites, `${name}: writes`);
    n++;
  };

  // guards: no read, no write
  await t('G1 no-guild', undefined, msg({ guild: null, guildId: null }), 'early', 0);
  assert.strictEqual(reads, 0, 'G1 no read');
  await t('G2 bot', undefined, msg({ author: { bot: true } }), 'early', 0);
  await t('G3 no-channel', undefined, msg({ channel: null }), 'early', 0);

  // seed legs
  await t('S1 missing-row', undefined, undefined, 'seeded', 1);
  await t('S2 null-row', null, undefined, 'seeded', 1);
  await t('S3 false-row', false, undefined, 'seeded', 1);
  await t('S4 zero-row', 0, undefined, 'seeded', 1);
  await t('S5 emptystr-row', '', undefined, 'seeded', 1);
  await t('S6 empty-list', { enable: false, list: {} }, undefined, 'seeded', 1);
  await t('S7 no-list-key', { enable: false }, undefined, 'seeded', 1);
  await t('S8 enable-true-empty-list', { enable: true, list: {} }, undefined, 'seeded', 1);
  await t('S9 null-list', { enable: false, list: null }, undefined, 'seeded', 1);
  await t('S10 num-list', { enable: false, list: 5 }, undefined, 'seeded', 1);
  await t('S11 scalar-true', true, undefined, 'seeded', 1);
  await t('S12 scalar-num', 7, undefined, 'seeded', 1);
  await t('S13 scalar-str', 'x', undefined, 'seeded', 1);
  await t('S14 array-base', [1, 2], undefined, 'seeded', 1);

  // keep legs
  await t('K1 one-entry', { enable: false, list: { owner9: { allowed: true } } }, undefined, 'kept', 0);
  await t('K2 other-entry', { enable: true, list: { u1: { allowed: true } } }, undefined, 'kept', 0);
  await t('K3 array-list', { enable: false, list: ['a'] }, undefined, 'kept', 0);
  await t('K4 string-list', { enable: false, list: 'ab' }, undefined, 'kept', 0);

  // seed shape legs
  store = new Map(); reads = 0; writes = [];
  await run(makeClient(), msg());
  assert.deepStrictEqual(writes[0][1], { enable: false, list: { owner9: { allowed: true } } }, 'shape whole-node');
  // ownerId undefined -> "undefined" key
  store = new Map(); writes = [];
  await run(makeClient(), msg({ guild: { id: 'g1' } }));
  assert.deepStrictEqual(writes[0][1], { enable: false, list: { undefined: { allowed: true } } }, 'shape undefined-owner');
  // S8 whole-node clobber: enable reset
  store = new Map([['g1.ALLOWLIST', { enable: true, list: {} }]]); writes = [];
  await run(makeClient(), msg());
  assert.deepStrictEqual(store.get('g1.ALLOWLIST'), { enable: false, list: { owner9: { allowed: true } } }, 'S8 clobber resets enable');

  console.log(`green ${n}/23+3`);
})().catch((e) => { console.error('RED:', e.message); process.exit(1); });
