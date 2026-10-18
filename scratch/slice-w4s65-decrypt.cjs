// W4 slice 65 battery: TS getDecryptedUserSession + attachMemberToSession
// enabled/decrypt legs, replicated verbatim from
// src/core/modules/lastFMScrobblerManager.ts:450-478,577-604.
// TS rules: (1) no settings/sessionKey/username -> null, NO invalidate.
// (2) decrypt falsy (undefined OR "") -> null + INVALIDATE. (3) enabled
// is checked at ATTACH (!auth.enabled -> skip), not inside the getter,
// so enabled:false/missing still returns auth with NO invalidate.
let invalidated = [];
function tsGetDecrypted(settings, decryptResult) {
  if (!settings?.sessionKey || !settings.username) return null;
  const d = decryptResult; // undefined = decrypt threw, "" = empty plaintext
  if (!d) { invalidated.push(settings.who); return null; }
  return { ...settings, sessionKey: d, username: settings.username };
}
function tsAttach(settings, decryptResult) {
  const auth = tsGetDecrypted(settings, decryptResult);
  if (!auth || !auth.enabled) return 'skip';
  return 'attach';
}
// Rust-current mirror (scrobbler.rs decrypted_user_session + attach site):
// enabled==false -> None; decrypt None -> None; "" passes through; no invalidate.
function rsAttach(settings, decryptResult) {
  let invalidatedRs = false;
  let r = (() => {
    if (settings == null) return null;
    if (settings.enabled === false) return null;
    const enc = settings.sessionKey, user = settings.username;
    if (typeof enc !== 'string' || enc === '' || typeof user !== 'string' || user === '') return null;
    const d = decryptResult;
    if (d === undefined || d === null) return null; // `?`, no invalidate
    return { key: d, user };
  })();
  if (r === null) return { verdict: 'skip', invalidatedRs };
  return { verdict: 'attach', invalidatedRs };
}
const cases = [
  ['A no-settings', undefined, 'K', 'skip/false', 'skip/false'],
  ['B no-sessionKey', { who: 'B', username: 'u', enabled: true }, 'K', 'skip/false', 'skip/false'],
  ['C no-username', { who: 'C', sessionKey: 'e', enabled: true }, 'K', 'skip/false', 'skip/false'],
  ['D decrypt-fail', { who: 'D', sessionKey: 'e', username: 'u', enabled: true }, undefined, 'skip/TRUE', 'skip/false'],
  ['E decrypt-empty', { who: 'E', sessionKey: 'e', username: 'u', enabled: true }, '', 'skip/TRUE', 'attach/false'],
  ['F enabled-false', { who: 'F', sessionKey: 'e', username: 'u', enabled: false }, 'K', 'skip/false', 'skip/false'],
  ['G enabled-missing', { who: 'G', sessionKey: 'e', username: 'u' }, 'K', 'skip/false', 'attach/false'],
  ['H enabled-true', { who: 'H', sessionKey: 'e', username: 'u', enabled: true }, 'K', 'attach/false', 'attach/false'],
];
let fails = 0;
for (const [name, s, d, wantTs, wantRs] of cases) {
  invalidated = [];
  const t = tsAttach(s, d);
  const gotTs = `${t}/${invalidated.length > 0 ? 'TRUE' : 'false'}`;
  const r = rsAttach(s, d);
  const gotRs = `${r.verdict}/${r.invalidatedRs ? 'TRUE' : 'false'}`;
  const okTs = gotTs === wantTs ? 'ok' : 'BATTERY-WRONG';
  const div = gotTs === gotRs ? 'SAME' : 'DIVERGE';
  if (okTs !== 'ok') fails++;
  console.log(`${name}: ts=${gotTs}(${okTs}) rs=${gotRs} -> ${div}`);
}
console.log(fails === 0 ? 'BATTERY GREEN (expect DIVERGE on D,E,G)' : 'BATTERY SCRIPT ERROR');
