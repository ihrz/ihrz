// W7 slice 15 battery: Events/invitemanager legs replicated verbatim.
//  - onInviteCreate.ts: `!invite.guild || !members.me?.permissions.has(ViewAuditLog)` early return;
//    `client.invites.get(guildId)?.set(code, {uses, inviterId, inviterUsername: inviter?.username || null})`;
//    `if (!check)` zero-row seed under `USER.${inviter?.id}.INVITES`.
//  - onInviteDelete.ts: `client.invites.get(guildId!)?.delete(code)`.
//  - onGuildLeave.ts: `client.invites.delete(guild.id)` unconditional.
'use strict';

// ---- onInviteCreate gate ----
function createGate(invite) {
  // `!invite.guild || !(invite.guild).members.me?.permissions.has(VAL)`
  const me = invite.guild?.members?.me;
  if (!invite.guild || !(me && me.perms.has('ViewAuditLog'))) return 'skip';
  return 'proceed';
}

// ---- onInviteCreate cache write ----
function createCache(cache, guildId, code, uses, inviterId, inviterUsername) {
  // `client.invites.get(guildId)?.set(code, {...})`
  cache.get(guildId)?.set(code, {
    uses,
    inviterId,
    inviterUsername: inviterUsername || null,
  });
}

// ---- onInviteCreate zero-row seed ----
function createSeed(db, guildId, inviterId) {
  // `const check = await db.get(`${guild}.USER.${inviter?.id}.INVITES`); if (!check) set zeros`
  const key = `${guildId}.USER.${inviterId}.INVITES`;
  const check = db.get(key);
  if (!check) db.set(key, { regular: 0, bonus: 0, leaves: 0, invites: 0 });
  return key;
}

const cases = [];
const t = (name, actual, expected) => cases.push([name, actual, expected]);

// gate legs
const VAL = (has) => ({ has: (p) => p === 'ViewAuditLog' ? has : false });
t('no-guild', createGate({ guild: null }), 'skip');
t('no-me', createGate({ guild: { members: {} } }), 'skip');
t('me-no-bit', createGate({ guild: { members: { me: { perms: VAL(false) } } } }), 'skip');
t('me-has-bit', createGate({ guild: { members: { me: { perms: VAL(true) } } } }), 'proceed');

// cache legs: missing entry is a no-op (?.set)
{
  const cache = new Map();
  createCache(cache, 'g1', 'abc', 3, 'u1', 'bob');
  t('missing-entry-noop', cache.has('g1'), false);
}
{
  const cache = new Map([['g1', new Map()]]);
  createCache(cache, 'g1', 'abc', 3, 'u1', 'bob');
  const e = cache.get('g1').get('abc');
  t('present-entry-shape', JSON.stringify(e), JSON.stringify({ uses: 3, inviterId: 'u1', inviterUsername: 'bob' }));
}
{
  const cache = new Map([['g1', new Map()]]);
  createCache(cache, 'g1', 'abc', 0, undefined, undefined);
  t('null-inviter-shape', JSON.stringify(cache.get('g1').get('abc')), JSON.stringify({ uses: 0, inviterUsername: null }));
}
{
  const cache = new Map([['g1', new Map()]]);
  createCache(cache, 'g1', 'abc', 1, 'u1', '');
  t('empty-username-null', cache.get('g1').get('abc').inviterUsername, null);
}

// seed legs: falsy check seeds, truthy keeps
for (const [label, check] of [['null', null], ['undef', undefined], ['zero', 0], ['empty-str', ''], ['false', false]]) {
  const db = new Map([['g1.USER.u1.INVITES', check]]);
  const key = createSeed(db, 'g1', 'u1');
  t(`seed-${label}`, JSON.stringify(db.get(key)), JSON.stringify({ regular: 0, bonus: 0, leaves: 0, invites: 0 }));
}
{
  const db = new Map([['g1.USER.u1.INVITES', { regular: 2, bonus: 0, leaves: 0, invites: 2 }]]);
  createSeed(db, 'g1', 'u1');
  t('seed-truthy-kept', db.get('g1.USER.u1.INVITES').regular, 2);
}
{
  // inviter?.id undefined -> literal "undefined" row
  const db = new Map();
  const key = createSeed(db, 'g1', undefined);
  t('seed-undefined-key', key, 'g1.USER.undefined.INVITES');
  t('seed-undefined-written', typeof db.get(key), 'object');
}

// delete legs
{
  const cache = new Map();
  cache.get('g1')?.delete('abc'); // must not throw
  t('delete-missing-guild-noop', cache.has('g1'), false);
}
{
  const cache = new Map([['g1', new Map([['abc', 1], ['def', 2]])]]);
  cache.get('g1')?.delete('abc');
  t('delete-hit', cache.get('g1').has('abc'), false);
  t('delete-keeps-sibling', cache.get('g1').has('def'), true);
  cache.get('g1')?.delete('zzz');
  t('delete-missing-code-noop', cache.get('g1').size, 1);
}

// guildDelete leg: unconditional remove
{
  const cache = new Map([['g1', new Map()], ['g2', new Map()]]);
  cache.delete('g1');
  t('leave-drops-guild', cache.has('g1'), false);
  t('leave-keeps-other', cache.has('g2'), true);
}

let fail = 0;
for (const [name, actual, expected] of cases) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) { fail++; console.log(`MISS ${name}: got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`); }
}
console.log(`${cases.length - fail}/${cases.length} legs green`);
process.exit(fail ? 1 : 0);
