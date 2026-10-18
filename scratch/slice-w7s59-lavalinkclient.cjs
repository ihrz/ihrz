// W7 slice 59 battery: src/Events/lavalink-client/* verbatim replications.
// A: lastFMScrobblerManager.ts handleVoiceStateUpdate:329-349 decision chain.
// B: h247Manager.ts handleH247RawVoicePacket:94-133 filter legs.
// C: stopMusicOnEmptyVoiceChannel.ts commented body (dead code, documents intent).
'use strict';
const assert = require('node:assert');

// ---------- A: lastFM handleVoiceStateUpdate ----------
function vsuDecision(oldState, newState, sessions) {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return 'none';
  const session = sessions.get(oldState.guild.id);
  if (!session) return 'none';
  const wasIn = oldState.channelId === session.voiceChannelId;
  const isIn = newState.channelId === session.voiceChannelId;
  if (!wasIn && isIn) return 'attach';
  if (wasIn && !isIn) return 'detach';
  return 'none';
}
const M = (bot) => ({ user: { bot } });
const S = (id) => ({ id });
const st = (oldM, oldCh, newM, newCh, sessions) =>
  vsuDecision({ member: oldM, channelId: oldCh, guild: { id: 'G' } },
              { member: newM, channelId: newCh }, sessions);
const noSess = new Map();
const sessV = new Map([['G', { voiceChannelId: 'V' }]]);
const aCases = [
  ['no-member', st(null, null, null, null, sessV), 'none'],
  ['bot-member', st(null, null, M(true), 'V', sessV), 'none'],
  ['no-session', st(null, null, M(false), 'V', noSess), 'none'],
  ['null->null', st(M(false), null, M(false), null, sessV), 'none'],
  ['null->V', st(M(false), null, M(false), 'V', sessV), 'attach'],
  ['null->O', st(M(false), null, M(false), 'O', sessV), 'none'],
  ['V->null', st(M(false), 'V', M(false), null, sessV), 'detach'],
  ['V->V', st(M(false), 'V', M(false), 'V', sessV), 'none'],
  ['V->O', st(M(false), 'V', M(false), 'O', sessV), 'detach'],
  ['O->null', st(M(false), 'O', M(false), null, sessV), 'none'],
  ['O->V', st(M(false), 'O', M(false), 'V', sessV), 'attach'],
  ['O->O', st(M(false), 'O', M(false), 'O', sessV), 'none'],
  // member fallback: new null, old present
  ['old-member-fallback', st(M(false), 'O', null, 'V', sessV), 'attach'],
];
for (const [n, got, want] of aCases) assert.strictEqual(got, want, `A ${n}`);

// ---------- B: handleH247RawVoicePacket ----------
const BOT_ID = 'bot1';
function h247raw(sessions, data) {
  if (!data || typeof data !== 'object' || !('t' in data) || !('d' in data)) return 'ignore';
  const packet = data, payload = packet.d;
  if (!payload || typeof payload.guild_id !== 'string') return 'ignore';
  const guildId = payload.guild_id;
  if (packet.t === 'VOICE_SERVER_UPDATE') {
    const session = sessions.get(guildId);
    if (!session) return 'ignore';
    session.token = typeof payload.token === 'string' ? payload.token : null;
    session.endpoint = typeof payload.endpoint === 'string' ? payload.endpoint : null;
    return 'vsu-stored';
  }
  if (packet.t === 'VOICE_STATE_UPDATE') {
    if (payload.user_id !== BOT_ID) return 'ignore';
    const session = sessions.get(guildId);
    if (!session) return 'ignore';
    if (typeof payload.session_id === 'string') session.sessionId = payload.session_id;
    if (typeof payload.channel_id === 'string') session.channelId = payload.channel_id;
    return 'vstu-stored';
  }
  return 'ignore';
}
function freshSessions() { return new Map([['G', {}]]); }
let s, r;
s = freshSessions(); r = h247raw(s, null); assert.strictEqual(r, 'ignore');
s = freshSessions(); r = h247raw(s, 'str'); assert.strictEqual(r, 'ignore');
s = freshSessions(); r = h247raw(s, { d: {} }); assert.strictEqual(r, 'ignore');
s = freshSessions(); r = h247raw(s, { t: 'X' }); assert.strictEqual(r, 'ignore');
s = freshSessions(); r = h247raw(s, { t: 'VOICE_SERVER_UPDATE', d: { guild_id: 5 } }); assert.strictEqual(r, 'ignore');
s = new Map(); r = h247raw(s, { t: 'VOICE_SERVER_UPDATE', d: { guild_id: 'G', token: 't', endpoint: 'e' } }); assert.strictEqual(r, 'ignore');
s = freshSessions(); r = h247raw(s, { t: 'VOICE_SERVER_UPDATE', d: { guild_id: 'G', token: 'tok', endpoint: 'ep' } });
assert.strictEqual(r, 'vsu-stored'); assert.deepStrictEqual(s.get('G'), { token: 'tok', endpoint: 'ep' });
s = freshSessions(); r = h247raw(s, { t: 'VOICE_SERVER_UPDATE', d: { guild_id: 'G', token: 7, endpoint: null } });
assert.strictEqual(r, 'vsu-stored'); assert.deepStrictEqual(s.get('G'), { token: null, endpoint: null });
s = freshSessions(); r = h247raw(s, { t: 'VOICE_STATE_UPDATE', d: { guild_id: 'G', user_id: 'other' } }); assert.strictEqual(r, 'ignore');
s = new Map(); r = h247raw(s, { t: 'VOICE_STATE_UPDATE', d: { guild_id: 'G', user_id: BOT_ID } }); assert.strictEqual(r, 'ignore');
s = freshSessions(); r = h247raw(s, { t: 'VOICE_STATE_UPDATE', d: { guild_id: 'G', user_id: BOT_ID, session_id: 'sess', channel_id: 9 } });
assert.strictEqual(r, 'vstu-stored'); assert.deepStrictEqual(s.get('G'), { sessionId: 'sess' });
s = freshSessions(); r = h247raw(s, { t: 'VOICE_STATE_UPDATE', d: { guild_id: 'G', user_id: BOT_ID, channel_id: 'C' } });
assert.strictEqual(r, 'vstu-stored'); assert.deepStrictEqual(s.get('G'), { channelId: 'C' });
s = freshSessions(); r = h247raw(s, { t: 'PRESENCE_UPDATE', d: { guild_id: 'G' } }); assert.strictEqual(r, 'ignore');

// ---------- C: commented stopMusic body ----------
const GuildVoice = 2, GuildText = 0;
function stopMusicDecision(player, channel) {
  if (player) {
    const channel_played = channel;
    if (channel_played?.type === GuildVoice && channel_played.members.size === 1) return 'stop-notify';
    else return 'nothing';
  }
  return 'nothing';
}
const ch = (type, n) => ({ type, members: { size: n } });
const cCases = [
  ['no-player', stopMusicDecision(null, ch(GuildVoice, 1)), 'nothing'],
  ['no-channel', stopMusicDecision({}, undefined), 'nothing'],
  ['alone-voice', stopMusicDecision({}, ch(GuildVoice, 1)), 'stop-notify'],
  ['two-voice', stopMusicDecision({}, ch(GuildVoice, 2)), 'nothing'],
  ['zero-voice', stopMusicDecision({}, ch(GuildVoice, 0)), 'nothing'],
  ['alone-text', stopMusicDecision({}, ch(GuildText, 1)), 'nothing'],
];
for (const [n, got, want] of cCases) assert.strictEqual(got, want, `C ${n}`);

console.log(`battery green: A=${aCases.length} B=13 C=${cCases.length}`);
