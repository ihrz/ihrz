// Slice W4-93 battery: LastFMScrobblerManager.invalidateUserSession +
// removeUserFromActiveSessions legs, replicated verbatim from
// src/core/modules/lastFMScrobblerManager.ts:606-628.
'use strict';
const cases = [];
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  cases.push({ name, ok, actual: a, expected: e });
  if (!ok) console.error(`FAIL ${name}: got ${a} want ${e}`);
}
// Minimal harness mirroring the TS bodies.
function makeWorld(rows) {
  const writes = [];
  const drops = []; // [guildId, userId] in drop order
  const table = {
    get: async (k) => (k in rows ? rows[k] : null),
    set: async (k, v) => { writes.push([k, JSON.parse(JSON.stringify(v))]); rows[k] = v; },
  };
  const guildSessions = new Map(); // gid -> { listeners: Map }
  return { table, writes, drops, guildSessions };
}
async function invalidateUserSession(w, userId) {
  const settings = await w.table.get(`${userId}.lastfm`);
  if (!settings) return { wrote: false };
  await w.table.set(`${userId}.lastfm`, {
    connectedAt: settings.connectedAt,
    enabled: false,
    username: settings.username,
  });
  for (const [gid, session] of w.guildSessions.entries()) {
    const listener = session.listeners.get(userId);
    if (!listener) continue;
    if (listener.timeout) { clearTimeout(listener.timeout); listener.timeout = undefined; }
    session.listeners.delete(userId);
    w.drops.push([gid, userId]);
  }
  return { wrote: true };
}
function mkSession(...uids) {
  return { listeners: new Map(uids.map((u) => [u, { timeout: undefined }])) };
}
(async () => {
  // I1: full row -> 3-key write, key + extras dropped, dropped from live.
  {
    const w = makeWorld({ '7.lastfm': { connectedAt: 111, enabled: true, sessionKey: 'enc', username: 'dj', junk: 1 } });
    w.guildSessions.set(1, mkSession('7', '8'));
    w.guildSessions.set(2, mkSession('7'));
    const r = await invalidateUserSession(w, '7');
    check('I1 wrote', r.wrote, true);
    check('I1 write shape', w.writes, [['7.lastfm', { connectedAt: 111, enabled: false, username: 'dj' }]]);
    check('I1 drops order', w.drops, [[1, '7'], [2, '7']]);
    check('I1 g1 kept other', [...w.guildSessions.get(1).listeners.keys()], ['8']);
  }
  // I2: missing connectedAt -> serializes away (undefined dropped by JSON).
  {
    const w = makeWorld({ '7.lastfm': { enabled: true, sessionKey: 'e', username: 'dj' } });
    await invalidateUserSession(w, '7');
    check('I2 write shape', w.writes, [['7.lastfm', { enabled: false, username: 'dj' }]]);
  }
  // I3: null row -> NO write, NO drop (listeners stay live).
  {
    const w = makeWorld({});
    w.guildSessions.set(1, mkSession('7'));
    const r = await invalidateUserSession(w, '7');
    check('I3 wrote', r.wrote, false);
    check('I3 no writes', w.writes, []);
    check('I3 no drops', w.drops, []);
    check('I3 listener kept', [...w.guildSessions.get(1).listeners.keys()], ['7']);
  }
  // I4: extra keys (incl. numeric/bool junk) all dropped.
  {
    const w = makeWorld({ '7.lastfm': { connectedAt: 5, enabled: true, sessionKey: 'e', username: 'u', a: 1, b: 'x', c: null } });
    await invalidateUserSession(w, '7');
    check('I4 write shape', w.writes, [['7.lastfm', { connectedAt: 5, enabled: false, username: 'u' }]]);
  }
  // I5: guild without the listener untouched; empty sessions fine.
  {
    const w = makeWorld({ '7.lastfm': { enabled: true, sessionKey: 'e', username: 'u' } });
    w.guildSessions.set(1, mkSession('9'));
    w.guildSessions.set(2, mkSession());
    w.guildSessions.set(3, mkSession('7'));
    await invalidateUserSession(w, '7');
    check('I5 drops', w.drops, [[3, '7']]);
    check('I5 g1 intact', [...w.guildSessions.get(1).listeners.keys()], ['9']);
  }
  // I6: connectedAt 0 is COPIED (no truthiness gate on the write leg).
  {
    const w = makeWorld({ '7.lastfm': { connectedAt: 0, enabled: true, sessionKey: 'e', username: 'u' } });
    await invalidateUserSession(w, '7');
    check('I6 write shape', w.writes, [['7.lastfm', { connectedAt: 0, enabled: false, username: 'u' }]]);
  }
  // I7: username undefined copies through (serializes away).
  {
    const w = makeWorld({ '7.lastfm': { connectedAt: 9, enabled: true, sessionKey: 'e' } });
    await invalidateUserSession(w, '7');
    check('I7 write shape', w.writes, [['7.lastfm', { connectedAt: 9, enabled: false }]]);
  }
  const failed = cases.filter((c) => !c.ok).length;
  console.log(`invalidate battery: ${cases.length - failed}/${cases.length} green`);
  process.exit(failed ? 1 : 0);
})();
