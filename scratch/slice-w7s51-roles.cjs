// W7 slice 51 battery: src/Events/logs/rolesLogs.ts verbatim legs.
// Replicates: roles-equals early return, ViewAuditLog+ManageGuild AND-gate,
// config/channel gate, entry miss/bot/target-mismatch gates, $add/$remove
// collection (other keys ignored), desc composition (" " base, remove leg +
// "\n", comma join, first-only replace), both-empty still-sends leg.
const assert = require('node:assert');
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; };

const DESC1 = "\u{1F4E4} <@${firstEntry.executor.id}> removed the ${removedRoles} role from ${oldMember.user.username}";
const DESC2 = "\u{1F4E5} <@${firstEntry.executor.id}> added the ${addedRoles} role to ${oldMember.user.username}";

// roles.cache.equals: discord.js compares size + every id (order-insensitive)
function rolesEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const k of a.keys()) if (!b.has(k)) return false;
  return true;
}
ok(rolesEqual(new Map([[1,1],[2,2]]), new Map([[2,2],[1,1]])), 'roles order-insensitive equal');
ok(!rolesEqual(new Map([[1,1]]), new Map([[1,1],[2,2]])), 'roles size differs');
ok(!rolesEqual(new Map([[1,1]]), new Map([[3,3]])), 'roles id differs');

// perm gate: has([ViewAuditLog, ManageGuild]) requires BOTH
const permGate = (perms) => perms.includes('ViewAuditLog') && perms.includes('ManageGuild');
ok(permGate(['ViewAuditLog','ManageGuild']), 'both bits proceed');
ok(!permGate(['ViewAuditLog']), 'view-only drops (fetch would succeed, TS silent)');
ok(!permGate(['ManageGuild']), 'manage-only drops');
ok(!permGate([]), 'no perms drops');

// $add/$remove collection verbatim
function collect(changes) {
  const newObjects = [], removeObjects = [];
  changes.forEach((item) => {
    if (item.key === '$add') newObjects.push(...item.new);
    else if (item.key === '$remove') removeObjects.push(...item.new);
  });
  return { newObjects, removeObjects };
}
let r = collect([{key:'$add',new:[{id:'1'},{id:'2'}]},{key:'$remove',new:[{id:'3'}]},{key:'nick',new:'x'}]);
ok(JSON.stringify(r.newObjects.map(o=>o.id)) === '["1","2"]', 'add collected');
ok(JSON.stringify(r.removeObjects.map(o=>o.id)) === '["3"]', 'remove collected');
r = collect([{key:'$add',new:[]}]);
ok(r.newObjects.length === 0 && r.removeObjects.length === 0, 'empty add, both empty');
assert.throws(() => collect([{key:'$add'}]), TypeError); pass++; // spread of undefined throws -> run() dies, no send
assert.throws(() => collect([{key:'$add',new:5}]), TypeError); pass++; // non-iterable spread throws

// desc composition verbatim (first-only replace, comma join via Array toString)
function render(addIds, remIds, execId, username) {
  let desc = ' ';
  if (remIds.length >= 1) {
    desc += DESC1.replace('${firstEntry.executor.id}', execId)
      .replace('${removedRoles}', remIds.map(v => `<@&${v}>`).toString())
      .replace('${oldMember.user.username}', username) + '\n';
  }
  if (addIds.length >= 1) {
    desc += DESC2.replace('${firstEntry.executor.id}', execId)
      .replace('${addedRoles}', addIds.map(v => `<@&${v}>`).toString())
      .replace('${oldMember.user.username}', username);
  }
  return desc;
}
ok(render(['1'], [], 'E', 'u') === ' \u{1F4E5} <@E> added the <@&1> role to u', 'add-only leg, leading space');
ok(render([], ['7','8'], 'E', 'u') === ' \u{1F4E4} <@E> removed the <@&7>,<@&8> role from u\n', 'remove leg comma-join no spaces + trailing newline');
ok(render(['1'], ['7'], 'E', 'u').includes('\n'), 'both legs newline between');
ok(render([], [], 'E', 'u') === ' ', 'both-empty still builds " " (TS sends it)');
ok('a${x}b${x}'.replace('${x}', 'Z') === 'aZb${x}', 'JS replace first-only (templates single-token, convergent)');

// entry gates: loose == on executorId
const BOT = '999';
const entryGate = (e, targetId) => !!e && !(e.executorId == BOT) && e.targetId === targetId;
ok(entryGate({executorId:'1', targetId:'T'}, 'T'), 'good entry proceeds');
ok(!entryGate(null, 'T'), 'miss drops');
ok(!entryGate({executorId:BOT, targetId:'T'}, 'T'), 'bot executor drops');
ok(!entryGate({executorId:'1', targetId:'O'}, 'T'), 'other target drops');
ok(!entryGate({executorId:null, targetId:'T'}, 'T') === false, 'null executor proceeds (null == "999" false)');
console.log(`SLICE-W7S51-ROLES GREEN ${pass}/22`);
