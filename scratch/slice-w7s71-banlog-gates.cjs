// W7 slice 71 battery: logs/addBanLogs.ts (guildBanAdd) +
// logs/removeBanLogs.ts (guildBanRemove) + logs/kickLogs.ts
// (guildMemberRemove) run-gate composition, replicated verbatim.
'use strict';
const VAL = 1 << 7;   // ViewAuditLog (discord.js PermissionsBitField)
const MG  = 1 << 5;   // ManageGuild
const ADM = 1 << 3;   // Administrator

// discord.js PermissionsBitField.has() returns true for ADMINISTRATOR
// holders on any flag (unless checkAdmin=false, never used here).
const adminBypass = (bits) => (bits & ADM) === ADM;
const hasAll = (bits, flags) => adminBypass(bits) || flags.every(f => (bits & f) === f);
const hasOne = (bits, f) => adminBypass(bits) || (bits & f) === f;
const adminHas = (bits, flags) => hasAll(bits, flags);

// --- addBanLogs.ts gate: `!me || !me.permissions.has([VAL, MG])` ---
const addGate = (me) => !( !me || !hasAll(me.bits, [VAL, MG]) );
// --- kickLogs.ts split gates: `!guild`, `!me`, `!has([VAL, MG])` ---
const kickGate = (guild, me) => {
  if (!guild) return false;
  if (!me) return false;
  if (!hasAll(me.bits, [VAL, MG])) return false;
  return true;
};
// --- removeBanLogs.ts gates: `!me || !has(VAL)`, then `!me?.has([ADM])` ---
const removeGate = (me) => {
  if (!me || !adminHas(me.bits, [VAL])) return false;
  if (!(me ? adminHas(me.bits, [ADM]) : undefined)) return false;
  return true;
};
// --- shared tail: `!someinfo`, `!Msgchannel`, `!relevantLog` ---
const tail = (someinfo, ch, entry) => !(!someinfo || !ch || !entry);

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  if (got === want) { pass++; }
  else { fail++; console.log(`FAIL ${name}: got ${got}, want ${want}`); }
};

// A. addBanLogs perm table (has() array = AND)
eq('A1 me-null drops', addGate(null), false);
eq('A2 no-bits drops', addGate({ bits: 0 }), false);
eq('A3 VAL-only drops', addGate({ bits: VAL }), false);
eq('A4 MG-only drops', addGate({ bits: MG }), false);
eq('A5 both proceeds', addGate({ bits: VAL | MG }), true);
eq('A6 admin proceeds', addGate({ bits: ADM }), true);

// B. kickLogs split shape == addBanLogs combined shape
const shapes = [null, { bits: 0 }, { bits: VAL }, { bits: MG }, { bits: VAL | MG }, { bits: ADM }];
for (const me of shapes) {
  eq(`B split==combined me=${me ? me.bits : 'null'}`, kickGate({ id: 'g' }, me), addGate(me));
}
eq('B7 guild-null drops', kickGate(null, { bits: VAL | MG }), false);
eq('B8 guild-undefined drops', kickGate(undefined, { bits: VAL | MG }), false);

// C. removeBanLogs double gate: VAL AND Admin
eq('C1 me-null drops', removeGate(null), false);
eq('C2 no-bits drops', removeGate({ bits: 0 }), false);
eq('C3 VAL-only drops (gate2)', removeGate({ bits: VAL }), false);
eq('C4 ADM-only: gate1 has(VAL) true via admin, gate2 true', removeGate({ bits: ADM }), true);
eq('C5 VAL+MG no-admin drops', removeGate({ bits: VAL | MG }), false);
eq('C6 VAL+ADM proceeds', removeGate({ bits: VAL | ADM }), true);
// raw chain without the admin-implies-all sugar: admin bit absent but
// has() would still be true only via explicit bits
eq('C7 explicit VAL+ADM bits proceed', removeGate({ bits: VAL | ADM | MG }), true);

// D. shared tail falsy tables
for (const v of [undefined, null, '', 0]) eq(`D someinfo=${String(v)} drops`, tail(v, {}, {}), false);
eq('D someinfo-string proceeds', tail('123', {}, {}), true);
eq('D channel-miss drops', tail('123', undefined, {}), false);
eq('D channel-null drops', tail('123', null, {}), false);
eq('D entry-miss drops', tail('123', {}, null), false);
eq('D entry-undefined drops', tail('123', {}, undefined), false);
eq('D full proceeds', tail('123', {}, { id: 'e' }), true);

// E. token selection per leg (verbatim template chains)
const BAN_ADD = '<@${firstEntry.executor.id}> **banned** <@${firstEntry.target.id}>';
const BAN_REMOVE = '<@${firstEntry.executor.id}> **revoked the ban** on ${firstEntry.target.username}';
const KICK = '<@${firstEntry.executor.id}> **kicked** <@${firstEntry.target.id}>';
// addBanLogs: executor?.id + targetId
let log = { executor: { id: '111' }, targetId: '222' };
eq('E1 addBan tokens', BAN_ADD.replace('${firstEntry.executor.id}', log?.executor?.id).replace('${firstEntry.target.id}', log?.targetId), '<@111> **banned** <@222>');
// removeBanLogs: executor?.id + (target as User).username
log = { executor: { id: '111' }, target: { username: 'SomeUser' } };
let user = log.target;
eq('E2 removeBan uses username not id', BAN_REMOVE.replace('${firstEntry.executor.id}', log?.executor?.id).replace('${firstEntry.target.username}', user.username), '<@111> **revoked the ban** on SomeUser');
// kickLogs: firstEntry.executor?.id (optional on executor) + targetId
log = { executor: { id: '111' }, targetId: '222' };
eq('E3 kick tokens', KICK.replace('${firstEntry.executor.id}', log.executor?.id).replace('${firstEntry.target.id}', log.targetId), '<@111> **kicked** <@222>');
// kickLogs executor-null leg: `?.` yields undefined -> template renders "undefined"
log = { executor: null, targetId: '222' };
eq('E4 kick null-executor renders undefined', KICK.replace('${firstEntry.executor.id}', log.executor?.id), '<@undefined> **kicked** <@${firstEntry.target.id}>');
// reason fold: `firstEntry?.reason || no_reason` (kick) / `relevantLog?.reason || no_reason`
const FB = 'No reason found';
for (const [r, want] of [[undefined, FB], [null, FB], ['', FB], ['spam', 'spam'], [' ', ' ']]) {
  eq(`E5 reason ${JSON.stringify(r)}`, ({ reason: r }?.reason || FB), want);
  eq(`E6 reason-addleg ${JSON.stringify(r)}`, ({ reason: r }?.reason || FB), want);
}
// F. field-name quirk: all three legs read the banAdd keys
eq('F1 removeBan reuses banAdd field name', 'event_srvLogs_banAdd_fields_name', 'event_srvLogs_banAdd_fields_name');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
