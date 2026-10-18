// W7 slice 55 battery: Events/client/blacklistFetcher.ts verbatim legs.
// Replicates: BanMembers gate, global strict ===true + DM/ban templates,
// fallthrough (no return) to the guild leg, guild strict ===true + templates,
// String.replace first-only, missing-reason "undefined" coercion.
'use strict';
const BAN = 4n; // PermissionFlagsBits.BanMembers
const has = (me, bit) => (me?.permissions.has(bit) ?? false);

// Verbatim gate: member.guild.members.me?.permissions.has(BanMembers)
function gate(me) {
  return !!(me?.permissions.has(BAN));
}
// Verbatim global leg decision + renders. Returns action list.
function globalLeg(data, lang) {
  const acts = [];
  if (data?.blacklisted === true) {
    acts.push(['dm', lang.globalMsg.replace('${data.reason}', data.reason)]);
    acts.push(['ban', lang.globalReason.replace('${data.reason}', data.reason)]);
  }
  return acts;
}
// Verbatim guild leg decision + renders.
function guildLeg(data2, lang) {
  const acts = [];
  if (data2?.blacklisted === true) {
    acts.push(['dm', lang.serverMsg.replace('${data2.reason}', data2?.reason)]);
    acts.push(['ban', lang.serverReason.replace('${data2.reason}', data2?.reason)]);
  }
  return acts;
}
// Full handler: gate, then BOTH legs (no return between them).
function handler(me, data, data2, lang) {
  if (!gate(me)) return [];
  return [...globalLeg(data, lang), ...guildLeg(data2, lang)];
}

const lang = {
  globalMsg: 'GLOB[${data.reason}]',
  globalReason: 'GR[${data.reason}]',
  serverMsg: 'SERV[${data2.reason}]',
  serverReason: 'SR[${data2.reason}]',
};
const meYes = { permissions: { has: (b) => b === BAN } };
const meNo = { permissions: { has: () => false } };
let pass = 0, fail = 0;
function eq(name, got, want) {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a === b) { pass++; }
  else { fail++; console.log(`FAIL ${name}\n  got  ${a}\n  want ${b}`); }
}

// 1. gate legs
eq('gate-null-me', handler(null, { blacklisted: true, reason: 'x' }, null, lang), []);
eq('gate-undefined-me', handler(undefined, { blacklisted: true, reason: 'x' }, null, lang), []);
eq('gate-no-bit', handler(meNo, { blacklisted: true, reason: 'x' }, null, lang), []);
// 2. global row shapes
eq('global-null', handler(meYes, null, null, lang), []);
eq('global-undefined', handler(meYes, undefined, null, lang), []);
eq('global-string', handler(meYes, 'spam', null, lang), []);
eq('global-false-flag', handler(meYes, { blacklisted: false, reason: 'r' }, null, lang), []);
eq('global-one-flag', handler(meYes, { blacklisted: 1, reason: 'r' }, null, lang), []);
eq('global-str-flag', handler(meYes, { blacklisted: 'true', reason: 'r' }, null, lang), []);
eq('global-hit', handler(meYes, { blacklisted: true, reason: 'r' }, null, lang),
  [['dm', 'GLOB[r]'], ['ban', 'GR[r]']]);
// 3. missing reason -> "undefined"
eq('global-no-reason', handler(meYes, { blacklisted: true }, null, lang),
  [['dm', 'GLOB[undefined]'], ['ban', 'GR[undefined]']]);
eq('guild-no-reason', handler(meYes, null, { blacklisted: true }, lang),
  [['dm', 'SERV[undefined]'], ['ban', 'SR[undefined]']]);
// 4. first-only replace
eq('global-first-only',
  globalLeg({ blacklisted: true, reason: 'r' },
    { globalMsg: '${data.reason}|${data.reason}', globalReason: 'x' }),
  [['dm', 'r|${data.reason}'], ['ban', 'x']]);
// 5. fallthrough: both listed -> 4 actions in order
eq('both-listed', handler(meYes, { blacklisted: true, reason: 'g' }, { blacklisted: true, reason: 's' }, lang),
  [['dm', 'GLOB[g]'], ['ban', 'GR[g]'], ['dm', 'SERV[s]'], ['ban', 'SR[s]']]);
// 6. guild-only
eq('guild-only', handler(meYes, null, { blacklisted: true, reason: 's' }, lang),
  [['dm', 'SERV[s]'], ['ban', 'SR[s]']]);
eq('guild-false-flag', handler(meYes, { blacklisted: true, reason: 'g' }, { blacklisted: false, reason: 's' }, lang),
  [['dm', 'GLOB[g]'], ['ban', 'GR[g]']]);
// 7. numeric reason coerces
eq('global-num-reason', handler(meYes, { blacklisted: true, reason: 5 }, null, lang),
  [['dm', 'GLOB[5]'], ['ban', 'GR[5]']]);
console.log(`battery: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
