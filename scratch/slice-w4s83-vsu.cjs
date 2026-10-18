// U-ETERNAL-448 slice W4-83: replicate lastFMScrobblerManager.ts
// handleVoiceStateUpdate dispatch verbatim (lines 329-349).
function dispatch({ newMember, oldMember, hasSession, oldChannelId, newChannelId, tracked }) {
  const member = newMember || oldMember;
  if (!member || member.user.bot) return 'return-early';
  const session = hasSession ? { voiceChannelId: tracked } : undefined;
  if (!session) return 'return-no-session';
  const wasInTrackedChannel = oldChannelId === session.voiceChannelId;
  const isInTrackedChannel = newChannelId === session.voiceChannelId;
  if (!wasInTrackedChannel && isInTrackedChannel) return 'attach';
  if (wasInTrackedChannel && !isInTrackedChannel) return 'detach';
  return 'noop';
}
const human = (id) => ({ id, user: { bot: false } });
const bot = (id) => ({ id, user: { bot: true } });
const cases = [
  // [name, input, expected]
  ['both-states-null-member', { newMember: null, oldMember: null, hasSession: true, oldChannelId: null, newChannelId: '7', tracked: '7' }, 'return-early'],
  ['both-undefined', { newMember: undefined, oldMember: undefined, hasSession: true, oldChannelId: undefined, newChannelId: '7', tracked: '7' }, 'return-early'],
  ['old-fallback-attach', { newMember: null, oldMember: human('u'), hasSession: true, oldChannelId: null, newChannelId: '7', tracked: '7' }, 'attach'],
  ['new-wins-over-old', { newMember: bot('b'), oldMember: human('u'), hasSession: true, oldChannelId: null, newChannelId: '7', tracked: '7' }, 'return-early'],
  ['bot-author', { newMember: bot('b'), oldMember: null, hasSession: true, oldChannelId: null, newChannelId: '7', tracked: '7' }, 'return-early'],
  ['no-session-join-shape', { newMember: human('u'), oldMember: null, hasSession: false, oldChannelId: null, newChannelId: '7', tracked: '7' }, 'return-no-session'],
  ['no-session-leave-shape', { newMember: human('u'), oldMember: human('u'), hasSession: false, oldChannelId: '7', newChannelId: null, tracked: '7' }, 'return-no-session'],
  ['join-from-nowhere', { newMember: human('u'), oldMember: null, hasSession: true, oldChannelId: null, newChannelId: '7', tracked: '7' }, 'attach'],
  ['move-in-from-other', { newMember: human('u'), oldMember: human('u'), hasSession: true, oldChannelId: '9', newChannelId: '7', tracked: '7' }, 'attach'],
  ['leave-to-nowhere', { newMember: human('u'), oldMember: human('u'), hasSession: true, oldChannelId: '7', newChannelId: null, tracked: '7' }, 'detach'],
  ['move-out-to-other', { newMember: human('u'), oldMember: human('u'), hasSession: true, oldChannelId: '7', newChannelId: '9', tracked: '7' }, 'detach'],
  ['mute-change-noop', { newMember: human('u'), oldMember: human('u'), hasSession: true, oldChannelId: '7', newChannelId: '7', tracked: '7' }, 'noop'],
  ['other-to-other-noop', { newMember: human('u'), oldMember: human('u'), hasSession: true, oldChannelId: '9', newChannelId: '8', tracked: '7' }, 'noop'],
  ['null-to-null-noop', { newMember: human('u'), oldMember: null, hasSession: true, oldChannelId: null, newChannelId: null, tracked: '7' }, 'noop'],
  ['undefined-legs-noop', { newMember: human('u'), oldMember: null, hasSession: true, oldChannelId: undefined, newChannelId: undefined, tracked: '7' }, 'noop'],
];
let fail = 0;
for (const [name, input, want] of cases) {
  const got = dispatch(input);
  if (got !== want) { console.log(`FAIL ${name}: got ${got}, want ${want}`); fail++; }
  else console.log(`ok ${name} -> ${got}`);
}
console.log(fail === 0 ? `ALL ${cases.length} PASS` : `${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
