// W4 slice 85 battery: replicates SlashCommands/lastfm/!config.ts guard order verbatim.
// TS: `if (enabled && !isConfigured()) return missingConfig; setEnabled(uid, enabled);
//      if (!ok) return loginRequired; return ok + embed`.
// setEnabled: enable needs sessionKey+username else {ok:false}; always merges
// {...(settings||{}), enabled}; !enabled runs removeUserFromActiveSessions (drop, no POST).
const assert = require('node:assert');

function makeClient(apiKey, sharedSecret, rows) {
  const writes = [];
  const drops = [];
  return {
    writes, drops,
    lastFMScrobbler: {
      isConfigured: () => Boolean(apiKey && sharedSecret),
      getMissingConfigurationMessage: () => 'missing_config',
      async setEnabled(userId, enabled) {
        const settings = rows[userId] ?? null;
        if (enabled && (!settings?.sessionKey || !settings.username)) return { ok: false };
        rows[userId] = { ...(settings || {}), enabled };
        writes.push([userId, { ...rows[userId] }]);
        if (!enabled) {
          for (const g of Object.values(sessions)) {
            if (g.listeners.has(userId)) { g.listeners.delete(userId); drops.push(userId); }
          }
        }
        return { ok: true };
      },
    },
  };
}

// live guild sessions (for the drop leg)
let sessions = {};
function resetSessions() {
  sessions = { g1: { listeners: new Map([['u1', {}], ['u2', {}]]) }, g2: { listeners: new Map([['u1', {}]]) } };
}

async function runConfig(client, power, uid) {
  const enabled = power === 'on';
  if (enabled && !client.lastFMScrobbler.isConfigured()) return 'missing_config';
  const result = await client.lastFMScrobbler.setEnabled(uid, enabled);
  if (!result.ok) return 'login_required';
  return enabled ? 'ok_enabled' : 'ok_disabled';
}

(async () => {
  const S = (o) => o; // session row helper
  let n = 0;
  async function Case(name, { apiKey, secret, rows, power, uid, want, wantRow, wantDrops }) {
    resetSessions();
    const c = makeClient(apiKey, secret, rows);
    const got = await runConfig(c, power, uid);
    assert.strictEqual(got, want, `${name}: outcome ${got} != ${want}`);
    assert.deepStrictEqual(rows[uid] ?? null, wantRow ?? null, `${name}: row`);
    assert.deepStrictEqual(c.drops, wantDrops ?? [], `${name}: drops`);
    n++;
  }

  await Case('on+cfg+session', { apiKey: 'k', secret: 's', rows: { u9: S({ sessionKey: 'K', username: 'n', enabled: false }) }, power: 'on', uid: 'u9', want: 'ok_enabled', wantRow: { sessionKey: 'K', username: 'n', enabled: true }, wantDrops: [] });
  await Case('on+cfg+norow', { apiKey: 'k', secret: 's', rows: {}, power: 'on', uid: 'u9', want: 'login_required', wantRow: null, wantDrops: [] });
  await Case('on+cfg+keyonly', { apiKey: 'k', secret: 's', rows: { u9: S({ sessionKey: 'K' }) }, power: 'on', uid: 'u9', want: 'login_required', wantRow: S({ sessionKey: 'K' }), wantDrops: [] });
  await Case('on+nocfg', { apiKey: '', secret: 's', rows: { u9: S({ sessionKey: 'K', username: 'n' }) }, power: 'on', uid: 'u9', want: 'missing_config', wantRow: S({ sessionKey: 'K', username: 'n' }), wantDrops: [] });
  await Case('on+nullcfg', { apiKey: null, secret: undefined, rows: {}, power: 'on', uid: 'u9', want: 'missing_config', wantRow: null, wantDrops: [] });
  await Case('off+cfg+session', { apiKey: 'k', secret: 's', rows: {}, power: 'off', uid: 'u1', want: 'ok_disabled', wantRow: { enabled: false }, wantDrops: ['u1', 'u1'] });
  await Case('off+cfg+norow', { apiKey: 'k', secret: 's', rows: {}, power: 'off', uid: 'u9', want: 'ok_disabled', wantRow: { enabled: false }, wantDrops: [] });
  await Case('off+nocfg+session', { apiKey: '', secret: 's', rows: {}, power: 'off', uid: 'u1', want: 'ok_disabled', wantRow: { enabled: false }, wantDrops: ['u1', 'u1'] });
  await Case('off+nocfg+norow', { apiKey: 'k', secret: '', rows: {}, power: 'off', uid: 'u9', want: 'ok_disabled', wantRow: { enabled: false }, wantDrops: [] });
  await Case('off+emptykey', { apiKey: '', secret: '', rows: { u2: S({ sessionKey: 'K', username: 'n', enabled: true, connectedAt: 5 }) }, power: 'off', uid: 'u2', want: 'ok_disabled', wantRow: { sessionKey: 'K', username: 'n', enabled: false, connectedAt: 5 }, wantDrops: ['u2'] });

  console.log(`green ${n}/${n}`);
})();
