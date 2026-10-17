// W7 slice 42 battery: replicate Events/h247/voiceState.ts gates verbatim,
// then pin the fixed Rust mirror (h247_event_proceeds) against every
// live-reachable case. Dead-leg deltas are asserted as documented.
const BOT = "BOTID";
// --- TS ground truth (verbatim from src/Events/h247/voiceState.ts) ---
function tsVerdict(oldState, newState, botId) {
  if (!oldState?.guild) return { proceed: false };
  if (newState.channelId === oldState.channelId) return { proceed: false };
  const memberId = newState.member?.id ?? oldState.member?.id;
  if (!memberId || memberId !== botId) return { proceed: false };
  return { proceed: true, guild: oldState.guild.id };
}
// --- Fixed Rust mirror: h247_event_proceeds(old_guild, is_self, old_ch, new_ch) ---
// old_guild = old snapshot guild presence; None folds the TS !oldState?.guild leg.
// is_self = packet user is the bot (serenity user_id infallible; member ??
// fallback folds to the same value whenever either snapshot has a member).
function rsVerdict(oldGuild, isSelf, oldCh, newCh, newGuild) {
  if (oldGuild == null) return { proceed: false };
  if (!(isSelf && oldCh !== newCh)) return { proceed: false };
  return { proceed: true, guild: newGuild };
}
const G = (id) => ({ id });
const M = (id) => ({ id });
let pass = 0, fail = 0;
function eq(name, got, want) {
  const a = JSON.stringify(got);
  if (a === want) { pass++; }
  else { fail++; console.log(`FAIL ${name}: got ${a}, want ${want}`); }
}
const P = (g) => JSON.stringify({ proceed: true, guild: g });
const S = JSON.stringify({ proceed: false });
// --- live-reachable legs: TS and fixed Rust must agree ---
let old, nw;
// 1. bot move 1->2
old = { guild: G("G1"), channelId: "1", member: M(BOT) };
nw = { channelId: "2", member: M(BOT) };
eq("move-ts", tsVerdict(old, nw, BOT), P("G1"));
eq("move-rs", rsVerdict(old.guild.id, true, "1", "2", "G1"), P("G1"));
// 2. bot join null->2
old = { guild: G("G1"), channelId: null, member: M(BOT) };
nw = { channelId: "2", member: M(BOT) };
eq("join-ts", tsVerdict(old, nw, BOT), P("G1"));
eq("join-rs", rsVerdict(old.guild.id, true, null, "2", "G1"), P("G1"));
// 3. bot leave 1->null
old = { guild: G("G1"), channelId: "1", member: M(BOT) };
nw = { channelId: null, member: M(BOT) };
eq("leave-ts", tsVerdict(old, nw, BOT), P("G1"));
eq("leave-rs", rsVerdict(old.guild.id, true, "1", null, "G1"), P("G1"));
// 4. mute/deafen-only, same channel -> skip both
old = { guild: G("G1"), channelId: "5", member: M(BOT) };
nw = { channelId: "5", member: M(BOT) };
eq("same-ts", tsVerdict(old, nw, BOT), S);
eq("same-rs", rsVerdict(old.guild.id, true, "5", "5", "G1"), S);
// 5. both null channel (mute-only while unconnected) -> skip both
old = { guild: G("G1"), channelId: null, member: M(BOT) };
nw = { channelId: null, member: M(BOT) };
eq("nullnull-ts", tsVerdict(old, nw, BOT), S);
eq("nullnull-rs", rsVerdict(old.guild.id, true, null, null, "G1"), S);
// 6. other member move -> skip both
old = { guild: G("G1"), channelId: "1", member: M("U9") };
nw = { channelId: "2", member: M("U9") };
eq("other-ts", tsVerdict(old, nw, BOT), S);
eq("other-rs", rsVerdict(old.guild.id, false, "1", "2", "G1"), S);
// 7. new member uncached (null), old member bot -> ?? proceeds both
old = { guild: G("G1"), channelId: "1", member: M(BOT) };
nw = { channelId: "2", member: null };
eq("newnull-ts", tsVerdict(old, nw, BOT), P("G1"));
eq("newnull-rs", rsVerdict(old.guild.id, true, "1", "2", "G1"), P("G1"));
// 8. old member uncached (null), new member bot -> proceeds both
old = { guild: G("G1"), channelId: "1", member: null };
nw = { channelId: "2", member: M(BOT) };
eq("oldnull-ts", tsVerdict(old, nw, BOT), P("G1"));
eq("oldnull-rs", rsVerdict(old.guild.id, true, "1", "2", "G1"), P("G1"));
// 9. cache-miss old snapshot (null) -> TS skips; fixed Rust skips too
nw = { channelId: "2", member: M(BOT) };
eq("oldmiss-ts", tsVerdict(null, nw, BOT), S);
eq("oldmiss-rs", rsVerdict(null, true, null, "2", "G1"), S);
// 10. old present but guild null -> TS skips; fixed Rust skips too
old = { guild: null, channelId: "1", member: M(BOT) };
nw = { channelId: "2", member: M(BOT) };
eq("guildnull-ts", tsVerdict(old, nw, BOT), S);
eq("guildnull-rs", rsVerdict(null, true, "1", "2", "G1"), S);
// --- dead-leg deltas (documented, unreachable on liveDiscord shapes) ---
// D1. both members null while packet user is the bot: TS skips (member-gated),
//     Rust proceeds (serenity user_id infallible, member cache warm for self).
old = { guild: G("G1"), channelId: "1", member: null };
nw = { channelId: "2", member: null };
eq("D1-ts-skips", tsVerdict(old, nw, BOT), S);
eq("D1-rs-proceeds", rsVerdict(old.guild.id, true, "1", "2", "G1"), P("G1"));
// D2. client.user null (never while receiving events): TS skips, Rust proceeds.
old = { guild: G("G1"), channelId: "1", member: M(BOT) };
nw = { channelId: "2", member: M(BOT) };
eq("D2-ts-skips", tsVerdict(old, nw, undefined), S);
// D3. undefined-vs-null channel (discord.js always sets null): TS !== proceeds.
old = { guild: G("G1"), channelId: null, member: M(BOT) };
nw = { channelId: undefined, member: M(BOT) };
eq("D3-ts-proceeds", tsVerdict(old, nw, BOT), P("G1"));
console.log(`battery: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
