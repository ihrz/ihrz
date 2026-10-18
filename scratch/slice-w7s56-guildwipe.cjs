// W7 slice 56 battery: Events/client/deleteDatabaseDataOnGuildLeave.ts legs verbatim.
'use strict';
const assert = require('node:assert');
let pass = 0;
function ok(name, cond) { assert.ok(cond, name); pass++; }

// --- TS legs replicated verbatim ---
const GUILD_DELETE_DELAY = 10 * 60 * 60 * 1000;
const enqueue = (queue, guild, now) => {
  const pending = { guildId: guild.id, guildName: guild.name, ownerId: guild.ownerId, deleteAt: now + GUILD_DELETE_DELAY };
  queue[guild.id] = pending; // unconditional overwrite, changed: true
  return pending;
};
const cancel = (queue, guildId) => {
  const pending = queue[guildId];
  if (!pending) return { changed: false, result: undefined };
  delete queue[guildId];
  return { changed: true, result: pending };
};
// clearGuildData: cache guard first; returns 'skipped' | 'wiped'
const clearGuildData = (cache, db, queue, guildId) => {
  if (cache.has(guildId)) return 'skipped';
  db.delete(guildId);
  delete queue[guildId];
  return 'wiped';
};
const scheduleDecision = (deleteAt, now) => (deleteAt - now <= 0 ? 'fire-now' : 'timer');
const findOwnerGuild = (guilds, guild) =>
  guilds.find((g) => g.id !== guild.id && g.ownerId === guild.ownerId);
const tsMention = (deleteAt, style) => `<t:${Math.floor(deleteAt / 1000)}:${style}>`;
const readQueue = (row) => row ?? {};
const recoverFilter = (pending, inShard) => {
  if (!pending?.guildId || !inShard(pending.guildId)) return 'skip';
  return scheduleDecision(pending.deleteAt, Date.now());
};

// 1. enqueue shape + 10h delay + overwrite refresh
let q = {};
const g = { id: 'G1', name: 'Test Guild', ownerId: 'O1' };
const p1 = enqueue(q, g, 1_000_000);
ok('delay-10h', p1.deleteAt === 1_000_000 + 36_000_000);
ok('shape-keys', p1.guildId === 'G1' && p1.guildName === 'Test Guild' && p1.ownerId === 'O1');
const p2 = enqueue(q, { ...g, name: 'Renamed' }, 2_000_000);
ok('overwrite-refresh', q.G1.guildName === 'Renamed' && q.G1.deleteAt === 2_000_000 + 36_000_000);

// 2. cancel legs
ok('cancel-absent-false', cancel({}, 'GX').result === undefined);
let q2 = { G1: { ...p1 } };
const c = cancel(q2, 'G1');
ok('cancel-present-true', c.changed === true && c.result.guildId === 'G1' && !('G1' in q2));

// 3. clearGuildData cache guard: present keeps entry, absent wipes
const db = new Set(['G1', 'G2']);
let q3 = { G1: { guildId: 'G1' }, G2: { guildId: 'G2' } };
ok('cached-skips-entry-kept', clearGuildData(new Set(['G1']), db, q3, 'G1') === 'skipped' && 'G1' in q3 && db.has('G1'));
ok('absent-wipes-entry-dropped', clearGuildData(new Set(['G1']), db, q3, 'G2') === 'wiped' && !('G2' in q3) && !db.has('G2'));

// 4. schedule boundary: remaining <= 0 fires immediately
ok('remaining-zero-fires', scheduleDecision(5000, 5000) === 'fire-now');
ok('remaining-neg-fires', scheduleDecision(4999, 5000) === 'fire-now');
ok('remaining-pos-timers', scheduleDecision(5001, 5000) === 'timer');

// 5. another-guild gate
const left = { id: 'L', ownerId: 'O9' };
ok('same-owner-other-guild', !!findOwnerGuild([{ id: 'A', ownerId: 'O9' }], left));
ok('self-only-skips', !findOwnerGuild([{ id: 'L', ownerId: 'O9' }], left));
ok('other-owner-skips', !findOwnerGuild([{ id: 'A', ownerId: 'OX' }], left));
ok('empty-cache-skips', !findOwnerGuild([], left));

// 6. timestamp floor, F embed vs R content
ok('mention-F', tsMention(1_759_999_999_999, 'F') === '<t:1759999999:F>');
ok('mention-R', tsMention(1_759_999_999_999, 'R') === '<t:1759999999:R>');
ok('mention-subsec-floors', tsMention(1_000_999, 'F') === '<t:1000:F>');

// 7. queue read nullish + recover skips
ok('null-row-empty', JSON.stringify(readQueue(null)) === '{}');
ok('undefined-row-empty', JSON.stringify(readQueue(undefined)) === '{}');
ok('recover-null-guildId-skips', recoverFilter({ deleteAt: 1 }, () => true) === 'skip');
ok('recover-null-row-skips', recoverFilter(null, () => true) === 'skip');
ok('recover-foreign-shard-skips', recoverFilter({ guildId: 'G', deleteAt: 1 }, () => false) === 'skip');

// 8. first-only replace on shipped templates (each token occurs once)
const T = {
  title: 'iHorizon has left ${guild.name}',
  desc: 'Waaah, this is sad. You kicked the bot from `${guild.name}`. The server data will be cleared ${deleteAt} if iHorizon is not back before then.',
  msg: 'Waaah, this is sad. You kicked iHorizon from `${guild.name}`. The data will be cleared ${deleteAt}.',
};
for (const [k, v] of Object.entries(T)) {
  ok(`single-guild-token-${k}`, v.split('${guild.name}').length - 1 === 1);
}
ok('single-deleteAt-desc', T.desc.split('${deleteAt}').length - 1 === 1);
ok('single-deleteAt-msg', T.msg.split('${deleteAt}').length - 1 === 1);
// guild name carrying a literal token: TS first-only keeps the injected one
const evil = 'x ${guild.name} y';
ok('evil-name-literal-kept', T.title.replace('${guild.name}', evil) === 'iHorizon has left x ${guild.name} y');

console.log(`W7S56 BATTERY GREEN ${pass}/${pass}`);
