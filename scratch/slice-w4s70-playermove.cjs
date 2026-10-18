// W4 slice 70 battery: TS handlePlayerMove + syncMembersWithVoiceChannel legs,
// replicated verbatim from src/core/modules/lastFMScrobblerManager.ts.
// session.voiceChannelId = newVoiceChannelId, then sync:
//   for (userId of listeners.keys) if (!members.has(userId)) detach(finalize)
//   for (member of members.values) if (!bot && !listeners.has(id)) attach
'use strict';
const assert = require('node:assert');

function syncMembers(session, members /* [{id,bot}] */, calls) {
  const set = new Map(members.map(m => [m.id, m]));
  for (const userId of [...session.listeners.keys()]) {
    if (!set.has(userId)) { calls.push(['detach', userId]); session.listeners.delete(userId); }
  }
  for (const m of members) {
    if (!m.bot && !session.listeners.has(m.id)) { calls.push(['attach', m.id]); session.listeners.set(m.id, 1); }
  }
}
function playerMove(sessions, guildId, newCh, members, calls) {
  const s = sessions.get(guildId);
  if (!s) return 'noop';
  s.voiceChannelId = newCh;
  syncMembers(s, members, calls);
  return 'synced';
}
const sess = (...ids) => ({ voiceChannelId: 'old', listeners: new Map(ids.map(i => [i, 1])) });

// 1: all stay + one newcomer + bot ignored + existing not re-attached
{
  const sessions = new Map([['g', sess('u1', 'u2')]]);
  const calls = [];
  assert.strictEqual(playerMove(sessions, 'g', 'new', [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }, { id: 'bot', bot: true }], calls), 'synced');
  assert.deepStrictEqual(calls, [['attach', 'u3']]);
  assert.strictEqual(sessions.get('g').voiceChannelId, 'new');
}
// 2: total move, old listeners gone -> detach-all (finalize) then attach
{
  const sessions = new Map([['g', sess('u1', 'u2')]]);
  const calls = [];
  playerMove(sessions, 'g', 'new', [{ id: 'u9' }], calls);
  assert.deepStrictEqual(calls, [['detach', 'u1'], ['detach', 'u2'], ['attach', 'u9']]);
}
// 3: detach preserves listener insertion order
{
  const sessions = new Map([['g', sess('c', 'a', 'b')]]);
  const calls = [];
  playerMove(sessions, 'g', 'new', [], calls);
  assert.deepStrictEqual(calls, [['detach', 'c'], ['detach', 'a'], ['detach', 'b']]);
}
// 4: no session -> noop, no channel write
{
  const sessions = new Map();
  const calls = [];
  assert.strictEqual(playerMove(sessions, 'g', 'new', [{ id: 'u1' }], calls), 'noop');
  assert.deepStrictEqual(calls, []);
}
// 5: empty new channel -> detach all, attach none
{
  const sessions = new Map([['g', sess('u1')]]);
  const calls = [];
  playerMove(sessions, 'g', 'new', [], calls);
  assert.deepStrictEqual(calls, [['detach', 'u1']]);
}
// 6: bot-only new channel -> detach old, attach nothing
{
  const sessions = new Map([['g', sess('u1')]]);
  const calls = [];
  playerMove(sessions, 'g', 'new', [{ id: 'b', bot: true }], calls);
  assert.deepStrictEqual(calls, [['detach', 'u1']]);
}
// 7: same-channel re-sync only attaches joiners, detaches leavers
{
  const sessions = new Map([['g', sess('u1', 'gone')]]);
  const calls = [];
  playerMove(sessions, 'g', 'same', [{ id: 'u1' }, { id: 'new' }], calls);
  assert.deepStrictEqual(calls, [['detach', 'gone'], ['attach', 'new']]);
}
// 8: channel id updates even when membership identical
{
  const sessions = new Map([['g', sess('u1')]]);
  const calls = [];
  playerMove(sessions, 'g', 'new', [{ id: 'u1' }], calls);
  assert.deepStrictEqual(calls, []);
  assert.strictEqual(sessions.get('g').voiceChannelId, 'new');
}
console.log('w4s70 battery: 8/8 green');
