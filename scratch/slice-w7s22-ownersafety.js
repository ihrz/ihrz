// W7 slice 22 battery: src/Events/utils/guildOwnerSafetySetWhenMessage.ts
// Replicates the gate chain + write shape + visited-after-write verbatim.
let fails = 0;
const ok = (cond, name) => {
  console.log(`${cond ? 'ok' : 'FAIL'} ${name}`);
  if (!cond) fails++;
};

function makeDb(failKeys = new Set()) {
  const store = new Map();
  return {
    store,
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async set(k, v) {
      if (failKeys.has(k)) throw new Error('db down');
      store.set(k, JSON.parse(JSON.stringify(v)));
    },
  };
}

// Verbatim port of the TS run() decision legs.
async function runSeal(db, visited, message) {
  if (!message.guild || message.author.bot || !message.channel) return 'skip-gate';
  if (visited.has(message.guildId)) return 'skip-visited';
  await db.set(`${message.guildId}.OWNER.${message.guild.ownerId}`, { owner: true })
    .then(() => { visited.add(message.guildId); });
  return 'sealed';
}

const msg = (o) => Object.assign(
  { guild: null, guildId: 'g1', author: { bot: false }, channel: { id: 'c1' } }, o);

const gates = [
  ['no-guild', msg({ guild: null })],
  ['bot', msg({ guild: {}, author: { bot: true } })],
  ['no-channel', msg({ guild: {}, channel: null })],
  ['dm-no-guildId', msg({ guild: null, guildId: null })],
];
for (const [name, m] of gates) {
  const db = makeDb(), v = new Set();
  ok(await runSeal(db, v, m) === 'skip-gate', `${name} skips`);
  ok(db.store.size === 0, `${name} no write`);
  ok(v.size === 0, `${name} no visit`);
}

// Fresh guild writes EXACT shape then visits.
{
  const db = makeDb(), v = new Set();
  const r = await runSeal(db, v, msg({ guild: { id: 'g9', ownerId: 'o7' }, guildId: 'g9' }));
  ok(r === 'sealed', 'fresh seals');
  ok(JSON.stringify(db.store.get('g9.OWNER.o7')) === JSON.stringify({ owner: true }), 'exact {owner:true} shape');
  ok(db.store.size === 1, 'single row, no GUILD.OWNER stray');
  ok(v.has('g9'), 'visited after write');
}

// Second message does NOT rewrite.
{
  const db = makeDb(), v = new Set(['g9']);
  db.store.set('g9.OWNER.o7', { owner: true });
  ok(await runSeal(db, v, msg({ guild: { id: 'g9', ownerId: 'o7' }, guildId: 'g9' })) === 'skip-visited', 'visited skips');
}

// Write failure -> NOT visited (retry next message).
{
  const db = makeDb(new Set(['g9.OWNER.o7'])), v = new Set();
  let threw = false;
  try { await runSeal(db, v, msg({ guild: { id: 'g9', ownerId: 'o7' }, guildId: 'g9' })); }
  catch { threw = true; }
  ok(threw, 'failure propagates (no swallow)');
  ok(!v.has('g9'), 'failed write must not visit');
}

// Webhook messages are NOT exempted (only author.bot gates).
{
  const db = makeDb(), v = new Set();
  const r = await runSeal(db, v, msg({ guild: { id: 'g', ownerId: 'o' }, guildId: 'g', webhookId: 'w1' }));
  ok(r === 'sealed', 'webhook still seals (no webhookId gate in TS)');
}

// Owner change reseals under the NEW owner id (no compare in TS).
{
  const db = makeDb(), v = new Set();
  await runSeal(db, v, msg({ guild: { id: 'g', ownerId: 'o1' }, guildId: 'g' }));
  v.clear(); // next boot
  await runSeal(db, v, msg({ guild: { id: 'g', ownerId: 'o2' }, guildId: 'g' }));
  ok(db.store.has('g.OWNER.o2'), 'new owner row written');
}

console.log(fails === 0 ? 'GREEN' : `RED ${fails}`);
if (fails !== 0) process.exit(1);
