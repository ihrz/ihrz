//! W7 slice 72 battery: client/ready.ts fetchInvites burst legs, verbatim.
const { PermissionsBitField } = require('discord.js');
const GuildFeature = { VanityURL: 'VANITY_URL' };
const MG = PermissionsBitField.Flags.ManageGuild;
const VAL = PermissionsBitField.Flags.ViewAuditLog;
const ADM = PermissionsBitField.Flags.Administrator;
let pass = 0, fail = 0;
function eq(name, a, b) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa === sb) { pass++; } else { fail++; console.log(`FAIL ${name}: got ${sa} want ${sb}`); }
}
// 1. batch-5 slicing: for (i = 0; i < len; i += 5) slice(i, i+5)
function batches(len) {
  const out = []; const gs = Array.from({ length: len }, (_, i) => i);
  for (let i = 0; i < gs.length; i += 5) out.push(gs.slice(i, i + 5));
  return out;
}
eq('b0', batches(0), []);
eq('b1', batches(1), [[0]]);
eq('b5', batches(5).length, 1);
eq('b6', batches(6).map(x => x.length), [5, 1]);
eq('b11', batches(11).map(x => x.length), [5, 5, 1]);
// 2. gate: !me?.permissions.has([MG, VAL]) — real discord.js has()
function gateProceeds(meBits /* bigint|null = no me */) {
  if (meBits === null) { const me = undefined; if (!me?.permissions.has([MG, VAL])) return false; return true; }
  const perms = new PermissionsBitField(meBits);
  if (!perms.has([MG, VAL])) return false;
  return true;
}
eq('g-both', gateProceeds(MG | VAL), true);
eq('g-mg-only', gateProceeds(MG), false);
eq('g-val-only', gateProceeds(VAL), false);
eq('g-none', gateProceeds(0n), false);
eq('g-admin-bypass', gateProceeds(ADM), true); // has() grants everything to admins
eq('g-admin-plus-one', gateProceeds(ADM | MG), true);
eq('g-nome', gateProceeds(null), false); // ?. miss leg skips
eq('g-all', gateProceeds((1n << 48n) - 1n), true);
// 3. tuple: { uses, inviterId, inviterUsername: inviter?.username || null }
function tuple(inv) { return { uses: inv.uses, inviterId: inv.inviterId, inviterUsername: inv.inviter?.username || null }; }
eq('t-full', tuple({ uses: 7, inviterId: '1', inviter: { username: 'amy' } }), { uses: 7, inviterId: '1', inviterUsername: 'amy' });
eq('t-noinviter', tuple({ uses: 3, inviterId: undefined, inviter: undefined }), { uses: 3, inviterId: undefined, inviterUsername: null });
eq('t-nullname', tuple({ uses: 1, inviterId: '2', inviter: { username: null } }), { uses: 1, inviterId: '2', inviterUsername: null });
eq('t-emptyname', tuple({ uses: 1, inviterId: '2', inviter: {} }), { uses: 1, inviterId: '2', inviterUsername: null });
// 4. vanity legs: feature gate -> fetch ok / throw -> null; no feature -> null
function vanity(features, fetchResult /* {ok,code,uses} | {throw:true} */) {
  if (features.includes(GuildFeature.VanityURL)) {
    try {
      if (fetchResult.throw) throw new Error('403');
      return { code: fetchResult.code, uses: fetchResult.uses };
    } catch { return null; }
  } else { return null; }
}
eq('v-ok', vanity(['VANITY_URL'], { code: 'abc', uses: 9 }), { code: 'abc', uses: 9 });
eq('v-throw', vanity(['VANITY_URL'], { throw: true }), null);
eq('v-nofeature', vanity(['COMMUNITY'], { code: 'abc', uses: 9 }), null);
eq('v-empty', vanity([], { code: 'abc', uses: 9 }), null);
// 5. per-guild error message shape
eq('err', `Error fetching invites for guild 123: ${new Error('x')}`, 'Error fetching invites for guild 123: Error: x');
console.log(`slice-w7s72: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
