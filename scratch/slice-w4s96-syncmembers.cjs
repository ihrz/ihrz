// W4 slice 96 battery: syncMembersWithVoiceChannel routing verbatim.
// TS source: src/core/modules/lastFMScrobblerManager.ts (syncMembersWithVoiceChannel).
//   guild fetch miss -> return (listeners KEPT, no detach/attach)
//   channel fetch miss -> return (KEPT)
//   channel type !== GuildVoice -> return (KEPT)
//   detach loop: listeners not in voiceChannel.members -> detach (insertion order)
//   attach loop: members non-bot + not listening -> attach (channel order)
'use strict';

const GuildVoice = 'GUILD_VOICE';

function syncMembers({ guild, channel, listeners, members }) {
  // guild: null (fetch miss) | { channels: Map }
  // channel: null (fetch miss) | { type, members: Map(id -> {bot}) }
  // returns { kept: true } or { detach: [], attach: [] }
  if (!guild) return { kept: true };
  if (!channel || channel.type !== GuildVoice) return { kept: true };
  const detach = [];
  for (const userId of listeners) {
    if (!channel.members.has(userId)) detach.push(userId);
  }
  const listening = new Set(listeners);
  const attach = [];
  for (const [id, m] of channel.members) {
    if (!m.bot && !listening.has(id)) attach.push(id);
  }
  return { detach, attach };
}

let pass = 0, fail = 0;
function eq(name, got, want) {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a === b) { pass++; }
  else { fail++; console.log(`FAIL ${name}: got ${a} want ${b}`); }
}
const V = (members) => ({ type: GuildVoice, members: new Map(members.map(m => [m.id, m])) });
const G = () => ({});

const M = (id, bot = false) => ({ id, bot });

// G1: guild fetch miss -> keep, even with leavers pending
eq('G1', syncMembers({ guild: null, channel: V([M(1)]), listeners: [2], members: null }), { kept: true });
// G2: channel fetch miss -> keep
eq('G2', syncMembers({ guild: G(), channel: null, listeners: [1], members: null }), { kept: true });
// G3: stage channel -> keep
eq('G3', syncMembers({ guild: G(), channel: { type: 'GUILD_STAGE_VOICE', members: new Map() }, listeners: [1], members: null }), { kept: true });
// G4: text channel -> keep
eq('G4', syncMembers({ guild: G(), channel: { type: 'GUILD_TEXT', members: new Map() }, listeners: [1], members: null }), { kept: true });
// G5: all stay, no ops
eq('G5', syncMembers({ guild: G(), channel: V([M(1), M(2)]), listeners: [1, 2] }), { detach: [], attach: [] });
// G6: newcomer attaches in channel order
eq('G6', syncMembers({ guild: G(), channel: V([M(1), M(3), M(2)]), listeners: [1, 2] }), { detach: [], attach: [3] });
// G7: leaver detaches in listener insertion order
eq('G7', syncMembers({ guild: G(), channel: V([M(9)]), listeners: [3, 1, 2] }), { detach: [3, 1, 2], attach: [9] });
// G8: bot newcomer skipped
eq('G8', syncMembers({ guild: G(), channel: V([M(1), M(7, true)]), listeners: [1] }), { detach: [], attach: [] });
// G9: already-listening member never re-attached
eq('G9', syncMembers({ guild: G(), channel: V([M(1), M(2)]), listeners: [1, 2] }), { detach: [], attach: [] });
// G10: empty session + empty channel
eq('G10', syncMembers({ guild: G(), channel: V([]), listeners: [] }), { detach: [], attach: [] });
// G11: empty channel detaches all, attaches none
eq('G11', syncMembers({ guild: G(), channel: V([]), listeners: [5, 6] }), { detach: [5, 6], attach: [] });
// G12: mixed leave+join+bot in one pass
eq('G12', syncMembers({ guild: G(), channel: V([M(2), M(8, true), M(4)]), listeners: [1, 2] }), { detach: [1], attach: [4] });
// G13: guild miss with empty listeners still keep (no crash)
eq('G13', syncMembers({ guild: null, channel: V([]), listeners: [] }), { kept: true });
// G14: undefined channel (fetch undefined) -> keep
eq('G14', syncMembers({ guild: G(), channel: undefined, listeners: [1] }), { kept: true });

console.log(`${pass}/${pass + fail} cases green`);
process.exit(fail ? 1 : 0);
