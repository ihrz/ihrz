// W7 slice 39 battery: avoidGuildEdit.ts + avoidWebhookModifying.ts
// Replicates the arm dispatch + owner reads verbatim (restore legs are
// per-field writes, mirrored at call sites; dispatch is the verdict).
function guildVerdict({ data, rule, mode, allowlisted, executorId, ownerId, ownerRow }) {
  if (!data) return 'no-data';
  if (rule !== true && !rule) return 'no-rule'; // if (data.updateguild) truthiness
  // relevantLog assumed present
  let shouldSanction = false;
  if (mode === 'allowlist') {
    if (!allowlisted) shouldSanction = true;
  } else if (mode === 'nobody') {
    if (executorId !== ownerId) shouldSanction = true;
  }
  // isOwner read is OUTSIDE both arms in avoidGuildEdit.ts
  if (!ownerRow && shouldSanction) return 'sanction';
  return 'no-sanction';
}
function webhookVerdict(args) {
  return guildVerdict(args); // identical dispatch shape in avoidWebhookModifying.ts
}
// webhook delete filter leg: webhook.id === relevantLog?.targetId
function webhookDeleteTargets(hooks, targetId) {
  return hooks.filter((h) => h.id === targetId).map((h) => h.id);
}
const cases = [
  // guild: [desc, args, expected]
  ['g-no-data', { data: null }, 'no-data'],
  ['g-no-rule', { data: 1, rule: undefined }, 'no-rule'],
  ['g-rule-false', { data: 1, rule: false }, 'no-rule'],
  ['g-truthy-string-rule', { data: 1, rule: 'yes', mode: 'allowlist', allowlisted: false, executorId: 'e', ownerId: 'o' }, 'sanction'],
  ['g-allowlist-stranger', { data: 1, rule: 1, mode: 'allowlist', allowlisted: false, executorId: 'e', ownerId: 'o' }, 'sanction'],
  ['g-allowlist-listed', { data: 1, rule: 1, mode: 'allowlist', allowlisted: true, executorId: 'e', ownerId: 'o' }, 'no-sanction'],
  ['g-allowlist-owner-norow', { data: 1, rule: 1, mode: 'allowlist', allowlisted: false, executorId: 'o', ownerId: 'o' }, 'sanction'],
  ['g-nobody-stranger', { data: 1, rule: 1, mode: 'nobody', executorId: 'e', ownerId: 'o' }, 'sanction'],
  ['g-nobody-owner', { data: 1, rule: 1, mode: 'nobody', executorId: 'o', ownerId: 'o' }, 'no-sanction'],
  ['g-nobody-stranger-ownerrow', { data: 1, rule: 1, mode: 'nobody', executorId: 'e', ownerId: 'o', ownerRow: { owner: true } }, 'no-sanction'],
  ['g-allowlist-stranger-ownerrow', { data: 1, rule: 1, mode: 'allowlist', allowlisted: false, executorId: 'e', ownerId: 'o', ownerRow: 1 }, 'no-sanction'],
  ['g-member-mode', { data: 1, rule: 1, mode: 'member', executorId: 'e', ownerId: 'o' }, 'no-sanction'],
  ['g-empty-mode', { data: 1, rule: 1, mode: '', executorId: 'e', ownerId: 'o' }, 'no-sanction'],
  ['g-undef-mode', { data: 1, rule: 1, mode: undefined, executorId: 'e', ownerId: 'o' }, 'no-sanction'],
  // webhook: same dispatch
  ['w-allowlist-stranger', { data: 1, rule: 1, mode: 'allowlist', allowlisted: false, executorId: 'e', ownerId: 'o' }, 'sanction'],
  ['w-allowlist-listed', { data: 1, rule: 1, mode: 'allowlist', allowlisted: true, executorId: 'e', ownerId: 'o' }, 'no-sanction'],
  ['w-nobody-stranger', { data: 1, rule: 1, mode: 'nobody', executorId: 'e', ownerId: 'o' }, 'sanction'],
  ['w-nobody-owner', { data: 1, rule: 1, mode: 'nobody', executorId: 'o', ownerId: 'o' }, 'no-sanction'],
  ['w-member-mode', { data: 1, rule: 1, mode: 'member', executorId: 'e', ownerId: 'o' }, 'no-sanction'],
];
let fail = 0;
for (const [name, args, want] of cases) {
  const got = (name[0] === 'g' ? guildVerdict : webhookVerdict)(args);
  if (got !== want) { console.log(`DIVERGE ${name}: got ${got} want ${want}`); fail++; }
}
// webhook target-id filter legs
const del1 = webhookDeleteTargets([{ id: 'a' }, { id: 'b' }], 'b');
if (JSON.stringify(del1) !== '["b"]') { console.log('DIVERGE w-filter-hit'); fail++; }
const del2 = webhookDeleteTargets([{ id: 'a' }], 'zzz');
if (del2.length !== 0) { console.log('DIVERGE w-filter-miss'); fail++; }
const del3 = webhookDeleteTargets([{ id: 'a' }, { id: 'a' }], 'a');
if (del3.length !== 2) { console.log('DIVERGE w-filter-multi'); fail++; }
console.log(fail === 0 ? `GREEN ${cases.length + 3}/${cases.length + 3}` : `${fail} FAILURES`);
process.exit(fail ? 1 : 0);
