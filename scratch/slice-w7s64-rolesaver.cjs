// W7 slice 64 battery: rolesaver onMemberLeave.ts + onMemberJoin.ts verbatim replication.
// Mirrors the TS run fns with stubbed db/member objects; expectations below are
// checked against the Rust pures (snapshot composition + restore gate).
'use strict';
const cases = [];
let n = 0;
function check(name, actual, expected) {
  n++;
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const ok = a === e;
  cases.push({ n, name, ok, actual: a, expected: e });
  if (!ok) console.log(`FAIL ${n} ${name}: got ${a} want ${e}`);
}

// ---- leave run replica (onMemberLeave.ts) ----
function leaveRun(db, member) {
  // if (await client.db.get(`${gid}.GUILD.GUILD_CONFIG.rolesaver.enable`))
  if (db.enable) {
    const admin = db.admin; // await get(...rolesaver.admin)
    const rolesArray = [];
    // member.roles.cache.each((role) => {...})
    for (const role of member.roles) {
      if (role.id === member.guildEveryoneId) continue; // `.each` callback return = skip this role only
      if (role.isAdmin && admin === 'no') continue;
      rolesArray.push(role.id);
    }
    return { wrote: rolesArray };
  }
  return { wrote: null }; // disabled: no write
}
// enable-gate truthiness legs (TS `if (await get(...))`)
for (const [label, v] of [['true', true], ['false-bool', false], ['1', 1], ['0', 0],
    ['str1', '1'], ['strTrue', 'true'], ['strFalse', 'FALSE-string'], ['emptyStr', ''],
    ['null', null], ['undef', undefined], ['obj', {}], ['arr', []]]) {
  const r = leaveRun({ enable: v }, { roles: [], guildEveryoneId: 'E' });
  check(`leave-enable:${label}`, r.wrote !== null, !!v);
}
// snapshot filter legs: roles (id, isAdmin, isEveryone-marker via guildEveryoneId)
const ROLES = [
  { id: 'E', isAdmin: false },   // @everyone
  { id: '10', isAdmin: false },  // plain
  { id: '20', isAdmin: true },   // admin-perm
  { id: '30', isAdmin: false },  // plain
];
for (const admin of ['no', 'yes', 'None', 'No', '', undefined]) {
  const r = leaveRun({ enable: true, admin }, { roles: ROLES.slice(1), guildEveryoneId: 'E' });
  const want = admin === 'no' ? ['10', '30'] : ['10', '20', '30'];
  check(`leave-snap:admin=${String(admin)}`, r.wrote, want);
}
// everyone id compare is string compare; numeric-vs-string mismatch keeps the role
check('leave-snap:everyone-skipped', leaveRun({ enable: true }, { roles: ROLES, guildEveryoneId: 'E' }).wrote, ['10', '20', '30']);
// empty roles -> TS still writes [] (no early return on leave)
check('leave-snap:empty-writes-empty', leaveRun({ enable: true }, { roles: [], guildEveryoneId: 'E' }).wrote, []);
// all-admin + opt-out -> writes []
check('leave-snap:all-admin-optout', leaveRun({ enable: true, admin: 'no' },
  { roles: [{ id: '20', isAdmin: true }], guildEveryoneId: 'E' }).wrote, []);

// ---- join run replica (onMemberJoin.ts) ----
function joinRun(db, member) {
  // if (await get(...rolesaver.enable))
  if (db.enable) {
    const array = db.row; // await get(`${gid}.ROLE_SAVER.${uid}`)
    if (!array || array.length === 0) return { restored: null, deleted: false };
    // await member.roles.set(array, '[RoleSaver] Give role back').catch(() => false)
    let setOk = true;
    try {
      // discord.js resolves every id; any unresolvable id rejects the whole set.
      // Model: numeric-string ids resolve, anything else throws.
      for (const id of array) if (!/^[0-9]+$/.test(id)) throw new Error('unknown role');
      // whole-set replace would apply here
    } catch { setOk = false; }
    // await client.db.delete(...) — runs even when set threw
    return { restored: setOk ? array.slice() : null, deleted: true };
  }
  return { restored: null, deleted: false };
}
check('join:row-null', joinRun({ enable: true, row: null }, {}), { restored: null, deleted: false });
check('join:row-undef', joinRun({ enable: true, row: undefined }, {}), { restored: null, deleted: false });
check('join:row-empty', joinRun({ enable: true, row: [] }, {}), { restored: null, deleted: false });
check('join:row-ids', joinRun({ enable: true, row: ['10', '30'] }, {}), { restored: ['10', '30'], deleted: true });
check('join:row-junk-str', joinRun({ enable: true, row: 'abc' }, {}), { restored: null, deleted: true }); // 'abc'.length=3, iterates as chars, set rejects, delete still runs
check('join:row-obj', joinRun({ enable: true, row: {} }, {}), { restored: null, deleted: true }); // {}.length undefined !== 0 -> set({}) throws -> delete runs
check('join:row-mixed', joinRun({ enable: true, row: ['10', 'junk', '30'] }, {}), { restored: null, deleted: true }); // whole set rejects
check('join:disabled-keeps-row', joinRun({ enable: false, row: ['10'] }, {}), { restored: null, deleted: false });
check('join:disabled-empty', joinRun({ enable: 0, row: [] }, {}), { restored: null, deleted: false });

const failed = cases.filter(c => !c.ok).length;
console.log(`\n${n - failed}/${n} cases green, ${failed} failed`);
if (failed) process.exit(1);
