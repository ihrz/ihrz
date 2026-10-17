// W7 slice 52 battery: src/Events/logs/channelUpdateLogs.ts verbatim legs.
// Replicates: Administrator gate, getDiff name leg, 4 perm-delta legs,
// new-overwrite added block (perm_added + ✅/❌ lines), removed-overwrite
// silence, empty-skip, >1024 truncation, either-found + both-bot gates,
// author fallback, desc token replace.
const assert = require('node:assert');
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; };

// ---- admin gate: !me?.permissions.has([Administrator]) -> return
const adminGate = (me) => !!me?.permissions?.has?.(['Administrator']);
ok(adminGate({ permissions: { has: (a) => a.includes('Administrator') } }), 'admin proceeds');
ok(!adminGate({ permissions: { has: () => false } }), 'non-admin drops');
ok(!adminGate(null), 'me-null drops via ?.');
ok(!adminGate({}), 'me-without-permissions drops via ?.');

// ---- getDiff verbatim (mock discord.js cache rows)
const T = {
  field_name: 'NAME:${newChannel.name}|',
  disabled_for: 'DIS ${perm} ${target}|',
  enabled_for: 'EN ${perm} ${target}|',
  allowed_for: 'AL ${perm} ${target}|',
  unallowed_for: 'UN ${perm} ${target}|',
  perm_added: 'ADD ${target}|',
};
function bitset(list) { return { toArray: () => [...list], has: (p) => list.includes(p) }; }
function getDiff(oldCh, newCh) {
  let after = '';
  if (oldCh.name !== newCh.name)
    after += T.field_name.replace('${newChannel.name}', newCh.name);
  oldCh.ows.forEach((oldPerm, id) => {
    const newPerm = newCh.ows.get(id);
    if (newPerm) {
      const target = newPerm.type === 0 ? `<@&${id}>` : `<@${id}>`;
      oldPerm.allow.toArray().filter((p) => !newPerm.allow.has(p))
        .forEach((p) => { after += T.disabled_for.replace('${perm}', p).replace('${target}', target); });
      newPerm.allow.toArray().filter((p) => !oldPerm.allow.has(p))
        .forEach((p) => { after += T.enabled_for.replace('${perm}', p).replace('${target}', target); });
      oldPerm.deny.toArray().filter((p) => !newPerm.deny.has(p))
        .forEach((p) => { after += T.allowed_for.replace('${perm}', p).replace('${target}', target); });
      newPerm.deny.toArray().filter((p) => !oldPerm.deny.has(p))
        .forEach((p) => { after += T.unallowed_for.replace('${perm}', p).replace('${target}', target); });
    }
  });
  newCh.ows.forEach((newPerm, id) => {
    if (!oldCh.ows.has(id)) {
      const target = newPerm.type === 0 ? `<@&${id}>` : `<@${id}>`;
      after += T.perm_added.replace('${target}', target);
      newPerm.allow.toArray().forEach((p) => { after += `-    ✅ ${p}\n`; });
      newPerm.deny.toArray().forEach((p) => { after += `-    ❌ ${p}\n`; });
    }
  });
  return after;
}
const ch = (name, rows) => ({ name, ows: new Map(rows) });
const ow = (type, allow, deny) => ({ type, allow: bitset(allow), deny: bitset(deny) });

ok(getDiff(ch('a', []), ch('a', [])) === '', 'identical -> empty (TS skips send)');
ok(getDiff(ch('a', []), ch('b', [])) === 'NAME:b|', 'rename leg');
ok(getDiff(ch('a', []), ch('a', [])) === '', 'same name no line');
// allow removed -> disabled_for, role mention (type 0)
let d = getDiff(ch('a', [[1, ow(0, ['SendMessages'], [])]]), ch('a', [[1, ow(0, [], [])]]));
ok(d === 'DIS SendMessages <@&1>|', 'removed allow -> disabled_for, role mention');
// allow added -> enabled_for, member mention (type 1)
d = getDiff(ch('a', [[2, ow(1, [], [])]]), ch('a', [[2, ow(1, ['ViewChannel'], [])]]));
ok(d === 'EN ViewChannel <@2>|', 'added allow -> enabled_for, member mention');
// deny removed -> allowed_for; deny added -> unallowed_for
d = getDiff(ch('a', [[1, ow(0, [], ['ManageMessages'])]]), ch('a', [[1, ow(0, [], [])]]));
ok(d === 'AL ManageMessages <@&1>|', 'removed deny -> allowed_for');
d = getDiff(ch('a', [[1, ow(0, [], [])]]), ch('a', [[1, ow(0, [], ['ManageMessages'])]]));
ok(d === 'UN ManageMessages <@&1>|', 'added deny -> unallowed_for');
// move allow->deny on same id: disabled + unallowed
d = getDiff(ch('a', [[1, ow(0, ['SendMessages'], [])]]), ch('a', [[1, ow(0, [], ['SendMessages'])]]));
ok(d === 'DIS SendMessages <@&1>|UN SendMessages <@&1>|', 'allow-to-deny move both legs, order');
// brand-new overwrite block
d = getDiff(ch('a', []), ch('a', [[5, ow(0, ['ViewChannel'], ['SendMessages'])]]));
ok(d === 'ADD <@&5>|-    ✅ ViewChannel\n-    ❌ SendMessages\n', 'new overwrite block shape');
// removed overwrite id: TS silent (no leg covers it)
d = getDiff(ch('a', [[9, ow(0, ['ViewChannel'], [])]]), ch('a', []));
ok(d === '', 'deleted overwrite id -> silent');
// type change same id keeps row (found by id), mention from NEW row
d = getDiff(ch('a', [[1, ow(0, [], [])]]), ch('a', [[1, ow(1, ['ViewChannel'], [])]]));
ok(d === 'EN ViewChannel <@1>|', 'mention uses new row type');

// ---- truncation: length (UTF-16 units) > 1024 -> substring(0,1021) + '...'
const trunc = (s) => s.length > 1024 ? s.substring(0, 1021) + '...' : s;
ok(trunc('x'.repeat(1024)) === 'x'.repeat(1024), '1024 untouched');
ok(trunc('x'.repeat(1025)) === 'x'.repeat(1021) + '...', '1025 truncates to 1021+...');
ok(trunc('x'.repeat(1025)).length === 1024, 'truncated total 1024');
ok('😀'.repeat(600).length === 1200 && trunc('😀'.repeat(600)).length === 1024, 'astral counts 2 units (length/substring domain)');

// ---- either-found + both-bot gates (slice-40 class, channel leg shape)
const BOT = '999';
const eitherFound = (r1, r2) => !(!r1 && !r2);
ok(!eitherFound(null, null), 'both miss drops');
ok(eitherFound({}, null) && eitherFound(null, {}) && eitherFound({}, {}), 'either proceeds');
const bothBot = (r1, r2) => r1?.executor?.id === BOT && r2?.executor?.id === BOT;
ok(bothBot({ executor: { id: BOT } }, { executor: { id: BOT } }), 'both-bot drops');
ok(!bothBot({ executor: { id: BOT } }, null), 'single-bot proceeds (missing leg ?. miss)');
ok(!bothBot({ executor: { id: '1' } }, { executor: { id: BOT } }), 'mixed proceeds');

// ---- author fallback + desc token
const author = (rel, unk) => rel?.executor?.username || unk;
ok(author({ executor: { username: 'eve' } }, '??') === 'eve', 'author name');
ok(author(null, 'UNKNOWN') === 'UNKNOWN', 'missing leg -> var_unknown');
ok(author({ executor: null }, 'UNKNOWN') === 'UNKNOWN', 'null executor -> var_unknown');
const desc = (tpl, id) => tpl.replace('${newChannel.toString()}', `<#${id}>`);
ok(desc('in ${newChannel.toString()} !', '42') === 'in <#42> !', 'desc channel token');
console.log(`SLICE-W7S52-CHANNELUPDATE GREEN ${pass}/28`);
