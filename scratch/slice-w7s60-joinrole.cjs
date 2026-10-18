'use strict';
// W7 slice 60 battery: replicates src/Events/guildconfig/joinRole.ts run-fn verbatim.
const assert = require('node:assert');

const MANAGE = 'ManageRoles';
const SET_REASON = '[AutoRole] Assign role for new member';
const ADD_REASON = '[JoinRole]';

function makeMember({ mePerms, cachedRoles, row, dbThrows, setRejects, addRejects }) {
  const calls = [];
  const cache = new Map((cachedRoles || []).map((id) => [id, { id }]));
  const member = {
    guild: {
      id: 'g1',
      members: { me: mePerms === undefined ? undefined : { permissions: { has: (f) => mePerms.includes(f) } } },
      roles: { cache: { get: (id) => cache.get(id) } },
    },
    roles: {
      set: async (ids, reason) => { calls.push(['set', ids, reason]); if (setRejects) throw new Error('set-fail'); return null; },
      add: async (role, reason) => { calls.push(['add', role && role.id, reason]); if (addRejects) throw new Error('add-fail'); return null; },
    },
  };
  const dbGet = async () => { if (dbThrows) throw new Error('db-down'); return row; };
  return { member, calls, dbGet };
}

// Verbatim port of joinRole.ts run body (perm flag name inlined).
async function tsJoinRole(member, dbGet) {
  const outcome = { returned: null, calls: [] };
  const rec = member.__rec;
  try {
    if (!member.guild.members.me?.permissions.has(MANAGE)) { outcome.returned = 'perm-gate'; return outcome; }
    const roleid = await dbGet(`${member.guild.id}.GUILD.GUILD_CONFIG.joinroles`);
    if (!roleid) { outcome.returned = 'falsy-row'; return outcome; }
    await Promise.resolve().then(async () => {
      if (Array.isArray(roleid)) {
        await member.roles.set(roleid, SET_REASON).catch(() => null);
      } else {
        const role = member.guild.roles.cache.get(roleid);
        if (role) await member.roles.add(role, ADD_REASON).catch(() => null);
      }
    });
    outcome.returned = 'done';
    return outcome;
  } catch { outcome.returned = 'swallowed'; return outcome; }
}

async function runCase(name, opts, expect) {
  const { member, calls, dbGet } = makeMember(opts);
  const out = await tsJoinRole(member, dbGet);
  assert.strictEqual(out.returned, expect.ret, `${name}: ret`);
  assert.deepStrictEqual(calls, expect.calls, `${name}: calls`);
  console.log(`ok ${name} -> ${out.returned} ${JSON.stringify(calls)}`);
}

(async () => {
  let n = 0;
  const t = async (...a) => { n++; await runCase(...a); };
  await t('me-undefined', { mePerms: undefined, row: ['1'] }, { ret: 'perm-gate', calls: [] });
  await t('no-manage-roles', { mePerms: [], row: ['1'] }, { ret: 'perm-gate', calls: [] });
  await t('db-throws', { mePerms: [MANAGE], dbThrows: true }, { ret: 'swallowed', calls: [] });
  await t('row-undefined', { mePerms: [MANAGE], row: undefined }, { ret: 'falsy-row', calls: [] });
  await t('row-null', { mePerms: [MANAGE], row: null }, { ret: 'falsy-row', calls: [] });
  await t('row-empty-string', { mePerms: [MANAGE], row: '' }, { ret: 'falsy-row', calls: [] });
  await t('row-zero', { mePerms: [MANAGE], row: 0 }, { ret: 'falsy-row', calls: [] });
  await t('row-false', { mePerms: [MANAGE], row: false }, { ret: 'falsy-row', calls: [] });
  await t('row-empty-array', { mePerms: [MANAGE], row: [] }, { ret: 'done', calls: [['set', [], SET_REASON]] });
  await t('row-array', { mePerms: [MANAGE], row: ['1', '2'] }, { ret: 'done', calls: [['set', ['1', '2'], SET_REASON]] });
  await t('row-single-cached', { mePerms: [MANAGE], row: '123', cachedRoles: ['123'] }, { ret: 'done', calls: [['add', '123', ADD_REASON]] });
  await t('row-single-uncached', { mePerms: [MANAGE], row: '123', cachedRoles: [] }, { ret: 'done', calls: [] });
  await t('row-number', { mePerms: [MANAGE], row: 123, cachedRoles: [] }, { ret: 'done', calls: [] });
  await t('set-rejects', { mePerms: [MANAGE], row: ['9'], setRejects: true }, { ret: 'done', calls: [['set', ['9'], SET_REASON]] });
  await t('add-rejects', { mePerms: [MANAGE], row: '7', cachedRoles: ['7'], addRejects: true }, { ret: 'done', calls: [['add', '7', ADD_REASON]] });
  console.log(`battery green ${n}/${n}`);
})().catch((e) => { console.error('BATTERY FAIL:', e.message); process.exit(1); });
