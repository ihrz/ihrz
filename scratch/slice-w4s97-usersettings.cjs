'use strict';
// W4 slice 97 battery: lastFMScrobblerManager.ts `getUserSettings`
// passthrough + downstream gate verdicts, replicated verbatim.
// getUserSettings returns table.get(`${userId}.lastfm`) as-is (null
// when missing, no normalization); the gates below consume it raw.
const assert = require('node:assert');

const VAR_NONE = 'None', VAR_EN = 'Enabled', VAR_DIS = 'Disabled';

// --- verbatim mirrors ---
const getUserSettings = (row) => row ?? null; // table.get miss -> null
const hasUserSession = (s) => Boolean(s?.sessionKey && s?.username);
const enableGateFires = (enabled, s) => enabled && (!s?.sessionKey || !s.username);
const embedStatus = (s) => (s?.enabled ? VAR_EN : VAR_DIS);
const embedAccount = (s) => (s?.username || VAR_NONE);
const embedStamp = (s) => (s?.connectedAt ? `<t:${Math.floor(s.connectedAt / 1000)}:F>` : null);

const cases = [
  // [name, row, hasSession, gateFires(en=true), status, account, stamp]
  ['missing-null', null, false, true, VAR_DIS, VAR_NONE, null],
  ['missing-undefined', undefined, false, true, VAR_DIS, VAR_NONE, null],
  ['full-object', { enabled: true, username: 'dj', sessionKey: 'k', connectedAt: 1700000000000 }, true, false, VAR_EN, 'dj', '<t:1700000000:F>'],
  ['no-enabled-flag', { username: 'dj', sessionKey: 'k' }, true, false, VAR_DIS, 'dj', null],
  ['empty-username', { enabled: true, username: '', sessionKey: 'k' }, false, true, VAR_EN, VAR_NONE, null],
  ['ws-username', { enabled: true, username: ' ', sessionKey: 'k' }, true, false, VAR_EN, ' ', null],
  ['zero-connectedAt', { enabled: true, username: 'dj', sessionKey: 'k', connectedAt: 0 }, true, false, VAR_EN, 'dj', null],
  ['bare-string', 'dj', false, true, VAR_DIS, VAR_NONE, null],
  ['bare-empty-string', '', false, true, VAR_DIS, VAR_NONE, null],
  ['number-zero', 0, false, true, VAR_DIS, VAR_NONE, null],
];

let n = 0;
for (const [name, row, wantSession, wantGate, wantStatus, wantAccount, wantStamp] of cases) {
  const s = getUserSettings(row);
  assert.strictEqual(hasUserSession(s), wantSession, `${name}: hasSession`);
  assert.strictEqual(Boolean(enableGateFires(true, s)), wantGate, `${name}: enableGate`);
  assert.strictEqual(embedStatus(s), wantStatus, `${name}: status`);
  assert.strictEqual(embedAccount(s), wantAccount, `${name}: account`);
  assert.strictEqual(embedStamp(s), wantStamp, `${name}: stamp`);
  n += 5;
}
console.log(`green ${n}/${n} (${cases.length} rows x 5 legs)`);
