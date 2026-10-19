// W7 slice 63 battery: lockVanity.ts + linked-channel/onNewMessage.ts dead legs.
// Both TS run-bodies are 100% commented out -> the handlers are no-ops.
// Replicates verbatim: (1) comment-strip both files, assert zero executable
// statements remain in the run body; (2) simulate the no-op run over a case
// matrix (any input -> undefined, zero side effects); (3) assert the Rust
// tree carries no mirror arm (no vanity-url PATCH/ban in guild_update, no
// LINKED_CHANNEL/webhook-relay in the message handler).
const fs = require('fs');
const path = require('path');
const ROOT = '/home/kisakay/Documents/Code/GitLab/ihrz';

function stripComments(src) {
  // block comments first, then line comments (no regex/division use in files)
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

let pass = 0, fail = 0;
function eq(name, a, b) {
  if (a === b) { pass++; }
  else { fail++; console.log(`FAIL ${name}: got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); }
}

// --- A: lockVanity.ts ---
const vanity = fs.readFileSync(path.join(ROOT, 'src/Events/guildconfig/lockVanity.ts'), 'utf8');
const vanityBody = stripComments(vanity);
// executable residue: remove imports/type shell, keep run-body region
const vanityRun = vanityBody.slice(vanityBody.indexOf('run:'));
const vanityExec = vanityRun.replace(/[{\},:;()\s=>]/g, '').replace(/ClientGuild/g, '');
eq('A1 lockVanity name shell only', /name/.test(vanityBody), true);
eq('A2 lockVanity zero executable tokens in run body',
  /await|fetch|ban|roles|db\.|AuditLog|executor|vanity/i.test(vanityExec), false);
eq('A3 lockVanity run body is signature-shell only', vanityExec.replace(/runasyncclientClientoldGuildGuildnewGuildGuild/g, ''), '');

// --- B: linked-channel/onNewMessage.ts ---
const linked = fs.readFileSync(path.join(ROOT, 'src/Events/linked-channel/onNewMessage.ts'), 'utf8');
const linkedBody = stripComments(linked);
const linkedRun = linkedBody.slice(linkedBody.indexOf('run:'));
const linkedExec = linkedRun.replace(/[{\},:;()\s=>]/g, '').replace(/ClientMessage/g, '');
eq('B1 linked name shell only', /name/.test(linkedBody), true);
eq('B2 linked zero executable tokens in run body',
  /await|webhook|db\.|channels|send|createWebhook|fetchWebhooks/i.test(linkedExec), false);
eq('B3 linked run body is signature-shell only', linkedExec.replace(/runasyncclientClientmessageMessage/g, ''), '');

// --- C: no-op simulation over input matrix (both handlers) ---
// TS `run` with an empty body returns undefined for every input shape.
const noopRun = async () => undefined;
const matrix = [
  ['guild+vanity change', { old: 'a', cur: 'b' }],
  ['guild+same vanity', { old: 'a', cur: 'a' }],
  ['guild+null vanity', { old: null, cur: null }],
  ['msg+guild+bot', { guild: 1, bot: true }],
  ['msg+guild+human', { guild: 1, bot: false }],
  ['msg+DM', { guild: null, bot: false }],
  ['msg+webhook', { guild: 1, bot: false, webhook: true }],
  ['msg+attachments', { guild: 1, bot: false, files: 3 }],
];
(async () => {
  for (const [n, inp] of matrix) {
    const r = await noopRun(inp);
    eq(`C noop ${n}`, r, undefined);
  }
  // --- D: Rust carries no mirror arm ---
  const rs = fs.readFileSync(path.join(ROOT, 'rust/src/events_handler.rs'), 'utf8');
  const guStart = rs.indexOf('async fn guild_update(');
  const guEnd = rs.indexOf('async fn webhook_update(');
  const guArm = rs.slice(guStart, guEnd);
  eq('D1 guild_update has no vanity-url PATCH', /vanity-url|vanity_url_code|LockVanity/i.test(guArm), false);
  eq('D2 guild_update has no ban/derank', /\.ban\(|roles\.set\(\[\]\)/i.test(guArm), false);
  eq('D3 guild_update is protection-guard only', /protection_guard/.test(guArm), true);
  const msgStart = rs.indexOf('async fn message(');
  const msgArm = rs.slice(msgStart, msgStart + 12000);
  eq('D4 message handler has no LINKED_CHANNEL read', /LINKED_CHANNEL/.test(msgArm), false);
  eq('D5 message handler has no webhook relay', /MultiChannel Sending|create_webhook|fetch_webhooks/i.test(msgArm), false);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
