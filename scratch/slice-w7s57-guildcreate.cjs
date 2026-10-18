/* W7 slice 57 battery: guildCreate.ts legs replicated verbatim (no discord client).
 * Run: node scratch/slice-w7s57-guildcreate.cjs (from repo root) */
const assert = require('node:assert');
const { PermissionsBitField, Collection } = require('discord.js');

let pass = 0;
function eq(actual, expected, label) {
  assert.deepStrictEqual(actual, expected, label);
  pass++;
}

/* ---- leg 1: blacklistLeave gate: (await get(`ownerId.blacklisted`)) || false ---- */
function tsBlacklistGate(leaf) { return leaf || false; }
const gateCases = [
  [true, true], [false, false], [1, 1], [0, false],
  ['true', 'true'], ['', false], [undefined, false], [null, false],
];
for (const [leaf, want] of gateCases) eq(tsBlacklistGate(leaf), want, `gate leaf=${String(leaf)}`);
/* strict-true reading (what the Rust fix must implement): */
function strictFlag(raw) {
  let obj; try { obj = JSON.parse(raw); } catch { return false; }
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return obj.blacklisted === true;
}
eq(strictFlag('{"blacklisted":true,"reason":"x"}'), true, 'strict true row');
eq(strictFlag('{"blacklisted":false,"reason":"x"}'), false, 'strict false row');
eq(strictFlag('{"blacklisted":1}'), false, 'strict 1 row');
eq(strictFlag('{"blacklisted":"true"}'), false, 'strict "true" row');
eq(strictFlag('plain legacy string'), false, 'strict legacy string');
eq(strictFlag('null'), false, 'strict null');
eq(strictFlag('{}'), false, 'strict missing flag');

/* ---- leg 2: blacklist channel pick: cache.get(systemId) || cache.random() ---- */
function tsBlacklistChannel(cache, systemId, randFn = Math.random) {
  const hit = cache.get(systemId);
  if (hit) return hit.id;
  // Collection.random() mirrors: index = floor(rand * size) over values
  const vals = [...cache.values()];
  if (!vals.length) return undefined;
  return vals[Math.floor(randFn() * vals.length)].id;
}
const chans = new Collection([['1', { id: '1' }], ['2', { id: '2' }], ['3', { id: '3' }]]);
eq(tsBlacklistChannel(chans, '2'), '2', 'system cached hit');
eq(tsBlacklistChannel(chans, '9', () => 0), '1', 'random idx 0');
eq(tsBlacklistChannel(chans, '9', () => 0.999), '3', 'random last');
eq(tsBlacklistChannel(chans, undefined, () => 0.5), '2', 'no system -> random');
eq(tsBlacklistChannel(new Collection(), '9'), undefined, 'empty cache -> undefined');

/* ---- leg 3: getInvites gate: !me?.permissions.has(ViewAuditLog) -> return ---- */
const VAL = PermissionsBitField.Flags.ViewAuditLog;
const MANAGE = PermissionsBitField.Flags.ManageGuild;
function tsInviteGate(me) {
  if (!me?.permissions.has(VAL)) return false;
  return true;
}
const P = (bits) => ({ permissions: new PermissionsBitField(bits) });
eq(tsInviteGate(null), false, 'no me -> skip');
eq(tsInviteGate(undefined), false, 'undefined me -> skip');
eq(tsInviteGate(P(VAL)), true, 'view only -> fetch');
eq(tsInviteGate(P(VAL | MANAGE)), true, 'view+manage -> fetch');
eq(tsInviteGate(P(MANAGE)), false, 'manage only -> skip');
eq(tsInviteGate(P(0n)), false, 'no bits -> skip');

/* ---- leg 4: setLangByRegion switch ---- */
function tsLangByRegion(loc) {
  switch (loc) {
    case 'fr': return 'fr-FR';
    case 'en-US': case 'en-GB': return 'en-US';
    case 'es-ES': return 'es-ES';
    case 'de': return 'de-DE';
    case 'it': return 'it-IT';
    case 'ja': return 'jp-JP';
    case 'pt-BR': return 'pt-PT';
    case 'ru': return 'ru-RU';
    default: return 'en-US';
  }
}
for (const [loc, want] of [['fr', 'fr-FR'], ['en-US', 'en-US'], ['en-GB', 'en-US'],
    ['es-ES', 'es-ES'], ['de', 'de-DE'], ['it', 'it-IT'], ['ja', 'jp-JP'],
    ['pt-BR', 'pt-PT'], ['ru', 'ru-RU'], ['xx', 'en-US'], ['', 'en-US'],
    ['FR', 'en-US'], ['en', 'en-US'], ['pt-PT', 'en-US'], ['zh-CN', 'en-US']]) {
  eq(tsLangByRegion(loc), want, `locale ${loc}`);
}

/* ---- leg 5: welcome pick: arr[floor(random()*len)]; desc.replace(token, pick) ---- */
function tsWelcomePick(arr, randFn = Math.random) { return arr[Math.floor(randFn() * arr.length)]; }
const titles = ['a', 'b', 'c'];
eq(tsWelcomePick(titles, () => 0), 'a', 'pick first');
eq(tsWelcomePick(titles, () => 0.999), 'c', 'pick last');
eq(tsWelcomePick([], () => 0), undefined, 'empty -> undefined');
eq('## ${randomMessage}\nhi'.replace('${randomMessage}', tsWelcomePick([], () => 0)), '## undefined\nhi', 'empty renders "undefined"');
eq('## ${randomMessage} ${randomMessage}'.replace('${randomMessage}', 'X'), '## X ${randomMessage}', 'replace first-only');

/* ---- leg 6: bio chain: if (!bio) return; triple replace (first-only each) ---- */
function tsBio(tpl, count, wink, home) {
  if (!tpl) return undefined;
  return tpl.replace('{count}', count).replace('{wink_emoji}', wink).replace('{home_emoji}', home);
}
eq(tsBio('', '5', 'W', 'H'), undefined, 'missing bio -> return');
eq(tsBio('{wink_emoji} **Bot** `+{count} cmds`', '42', '<:W:1>', '<:H:2>'),
  '<:W:1> **Bot** `+42 cmds`', 'bio full chain');
eq(tsBio('{count} {count}', '7', 'W', 'H'), '7 {count}', 'count first-only');
eq(tsBio('no tokens', '7', 'W', 'H'), 'no tokens', 'bio passthrough');
eq(tsBio('{wink_emoji}', '7', undefined, 'H'), 'undefined', 'undefined wink renders');

console.log(`W7S57 battery green: ${pass} asserts`);
