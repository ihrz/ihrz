// W4 slice 100 battery: replicate !login.ts + !config.ts run() verbatim.
const assert = require('node:assert');

// ---- stubs ----
function makeManager(scn) {
  return {
    calls: [],
    isConfigured: () => scn.configured,
    login: async (uid, u, p) => { scn.sawLogin = [uid, u, p]; if (!scn.configured) return { ok: false, message: 'MISSING' }; return scn.loginResult; },
    setEnabled: async (uid, en) => { scn.sawSetEnabled = [uid, en]; return scn.setResult; },
    getMissingConfigurationMessage: () => 'MISSING',
    generateUserEmbed: async (uid, label) => ({ embedFor: [uid, label], row: scn.rowAfterWrite }),
  };
}
function makeCtx(user) {
  const sent = [];
  return { user, sent, interactionSend: async (_ix, p) => { sent.push(p); } };
}

// ---- verbatim !login.ts run ----
async function loginRun(client, interaction, lang) {
  if (!interaction.user) return;
  const username = interaction.options.getString('username', true);
  const password = interaction.options.getString('password', true);
  const result = await client.lastFMScrobbler.login(interaction.user.id, username, password, lang);
  await client.func.method.interactionSend(interaction, {
    content: result.message,
    embeds: result.ok
      ? [await client.lastFMScrobbler.generateUserEmbed(interaction.user.id, interaction.user.username, lang)]
      : []
  });
}
// ---- verbatim !config.ts run ----
async function configRun(client, interaction, lang) {
  if (!interaction.user) return;
  const power = interaction.options.getString('power', true);
  const enabled = power === 'on';
  if (enabled && !client.lastFMScrobbler.isConfigured()) {
    return client.func.method.interactionSend(interaction, {
      content: client.lastFMScrobbler.getMissingConfigurationMessage(lang)
    });
  }
  const result = await client.lastFMScrobbler.setEnabled(interaction.user.id, enabled);
  if (!result.ok) {
    return client.func.method.interactionSend(interaction, {
      content: lang.lastfm_config_login_required.replace(/\${client\.iHorizon_Emojis\.No}/g, 'NO')
    });
  }
  await client.func.method.interactionSend(interaction, {
    content: enabled
      ? lang.lastfm_config_enabled.replace(/\${client\.iHorizon_Emojis\.Yes}/g, 'YES')
      : lang.lastfm_config_disabled.replace(/\${client\.iHorizon_Emojis\.Yes}/g, 'YES'),
    embeds: [await client.lastFMScrobbler.generateUserEmbed(interaction.user.id, interaction.user.username, lang)]
  });
}

const lang = {
  lastfm_config_login_required: '${client.iHorizon_Emojis.No} | need login',
  lastfm_config_enabled: '${client.iHorizon_Emojis.Yes} | on',
  lastfm_config_disabled: '${client.iHorizon_Emojis.Yes} | off',
};
function clientFor(scn, ctx) {
  return { lastFMScrobbler: makeManager(scn), func: { method: { interactionSend: ctx.interactionSend } } };
}
function opts(map) { return { getString: (k) => map[k] }; }
let n = 0;
(async () => {

// L1: login no-user -> no reply
{
  const scn = { configured: true, loginResult: { ok: true, message: 'm' } };
  const ctx = makeCtx(null);
  await loginRun(clientFor(scn, ctx), { user: null, options: opts({}) }, lang);
  assert.strictEqual(ctx.sent.length, 0); n++;
}
// L2: login unconfigured failure -> content-only
{
  const scn = { configured: false, loginResult: { ok: false, message: 'MISSING' } };
  const ctx = makeCtx({ id: 'u1', username: 'U' });
  const ix = { user: ctx.user, options: opts({ username: 'a', password: 'b' }) };
  await loginRun(clientFor(scn, ctx), ix, lang);
  assert.strictEqual(ctx.sent.length, 1);
  assert.strictEqual(ctx.sent[0].content, 'MISSING');
  assert.deepStrictEqual(ctx.sent[0].embeds, []); n++;
}
// L3: login api-error -> content-only
{
  const scn = { configured: true, loginResult: { ok: false, message: 'ERR e9' } };
  const ctx = makeCtx({ id: 'u1', username: 'U' });
  await loginRun(clientFor(scn, ctx), { user: ctx.user, options: opts({ username: 'a', password: 'b' }) }, lang);
  assert.strictEqual(ctx.sent[0].content, 'ERR e9');
  assert.deepStrictEqual(ctx.sent[0].embeds, []); n++;
}
// L4: login success -> content + exactly 1 embed, embed reflects fresh write
{
  const scn = { configured: true, loginResult: { ok: true, message: 'YES | dj' }, rowAfterWrite: { enabled: true, username: 'dj', connectedAt: 5 } };
  const ctx = makeCtx({ id: 'u1', username: 'U' });
  await loginRun(clientFor(scn, ctx), { user: ctx.user, options: opts({ username: 'dj', password: 'pw' }) }, lang);
  assert.strictEqual(ctx.sent[0].content, 'YES | dj');
  assert.strictEqual(ctx.sent[0].embeds.length, 1);
  assert.deepStrictEqual(scn.sawLogin, ['u1', 'dj', 'pw']);
  assert.deepStrictEqual(ctx.sent[0].embeds[0].embedFor, ['u1', 'U']);
  assert.deepStrictEqual(ctx.sent[0].embeds[0].row, { enabled: true, username: 'dj', connectedAt: 5 }); n++;
}
// C1: config no-user -> no reply, setEnabled untouched
{
  const scn = { configured: true, setResult: { ok: true } };
  const ctx = makeCtx(null);
  await configRun(clientFor(scn, ctx), { user: null, options: opts({ power: 'on' }) }, lang);
  assert.strictEqual(ctx.sent.length, 0);
  assert.strictEqual(scn.sawSetEnabled, undefined); n++;
}
// C2: power strict === mapping
for (const [p, want] of [['on', true], ['off', false], ['ON', false], ['', false], ['off ', false]]) {
  const scn = { configured: true, setResult: { ok: true }, rowAfterWrite: {} };
  const ctx = makeCtx({ id: 'u', username: 'U' });
  await configRun(clientFor(scn, ctx), { user: ctx.user, options: opts({ power: p }) }, lang);
  assert.deepStrictEqual(scn.sawSetEnabled, ['u', want], `power=${p}`); n++;
}
// C3: enable + unconfigured -> missing reply, setEnabled NOT called
{
  const scn = { configured: false, setResult: { ok: true } };
  const ctx = makeCtx({ id: 'u', username: 'U' });
  await configRun(clientFor(scn, ctx), { user: ctx.user, options: opts({ power: 'on' }) }, lang);
  assert.strictEqual(ctx.sent[0].content, 'MISSING');
  assert.strictEqual(ctx.sent[0].embeds, undefined);
  assert.strictEqual(scn.sawSetEnabled, undefined); n++;
}
// C4: off + unconfigured -> reaches setEnabled (power-off always writes)
{
  const scn = { configured: false, setResult: { ok: true }, rowAfterWrite: {} };
  const ctx = makeCtx({ id: 'u', username: 'U' });
  await configRun(clientFor(scn, ctx), { user: ctx.user, options: opts({ power: 'off' }) }, lang);
  assert.deepStrictEqual(scn.sawSetEnabled, ['u', false]); n++;
}
// C5: setEnabled deny -> login_required content-only, no embed key
{
  const scn = { configured: true, setResult: { ok: false } };
  const ctx = makeCtx({ id: 'u', username: 'U' });
  await configRun(clientFor(scn, ctx), { user: ctx.user, options: opts({ power: 'on' }) }, lang);
  assert.strictEqual(ctx.sent[0].content, 'NO | need login');
  assert.strictEqual(ctx.sent[0].embeds, undefined); n++;
}
// C6/C7: ok on/off -> content + always exactly 1 embed
for (const [p, want] of [['on', 'YES | on'], ['off', 'YES | off']]) {
  const scn = { configured: true, setResult: { ok: true }, rowAfterWrite: { enabled: p === 'on' } };
  const ctx = makeCtx({ id: 'u', username: 'U' });
  await configRun(clientFor(scn, ctx), { user: ctx.user, options: opts({ power: p }) }, lang);
  assert.strictEqual(ctx.sent[0].content, want);
  assert.strictEqual(ctx.sent[0].embeds.length, 1); n++;
}
console.log(`slice-w4s100 green ${n}/15`);
})();
