// W7 slice 45 battery: replicates src/Events/logs/voiceLogs.ts decision chain verbatim.
const BOT = "bot-id";
function decide(oldState, newState, targetUserId) {
  if (!oldState || !oldState.guild) return "none:old-gate";
  // someinfo + Msgchannel gates assumed configured/present
  if (targetUserId === BOT) return "none:bot";
  const Ouser = oldState.id, OchannelID = oldState.channelId;
  const Ostatus = { selfDeaf: oldState.selfDeaf, selfMute: oldState.selfMute };
  const user = newState.id, channelID = newState.channelId;
  const status = { selfDeaf: newState.selfDeaf, selfMute: newState.selfMute };
  if (user && !channelID) return "leave";
  if (Ouser && !OchannelID) return "join";
  if (!Ostatus.selfDeaf && status.selfDeaf) return "deaf-on";
  if (Ostatus.selfDeaf && !status.selfDeaf) return "deaf-off";
  if (!Ostatus.selfMute && status.selfMute) return "mute-on";
  if (Ostatus.selfMute && !status.selfMute) return "mute-off";
  return "none:silent";
}
const G = {}, U = "user-1";
const st = (o) => Object.assign({ id: U, guild: G, channelId: null, selfDeaf: false, selfMute: false }, o);
const ns = (o) => Object.assign({ id: U, channelId: null, selfDeaf: false, selfMute: false }, o);
const cases = [
  ["old-null,new-voice", null, ns({ channelId: "c1" }), U, "none:old-gate"],
  ["old-guild-null", st({ guild: null, channelId: "c1" }), ns({ channelId: "c1" }), U, "none:old-gate"],
  ["leave", st({ channelId: "c1" }), ns({}), U, "leave"],
  ["leave-both-none", st({}), ns({}), U, "leave"], // OchannelID undefined -> "undefined" text, still leave leg
  ["join", st({}), ns({ channelId: "c1" }), U, "join"],
  ["join+mute-change", st({}), ns({ channelId: "c1", selfMute: true }), U, "join"],
  ["leave+deaf-change", st({ channelId: "c1", selfDeaf: true }), ns({}), U, "leave"],
  ["move-same-flags", st({ channelId: "c1" }), ns({ channelId: "c2" }), U, "none:silent"],
  ["move+mute-on", st({ channelId: "c1" }), ns({ channelId: "c2", selfMute: true }), U, "mute-on"],
  ["deaf-on", st({ channelId: "c1" }), ns({ channelId: "c1", selfDeaf: true }), U, "deaf-on"],
  ["deaf-off", st({ channelId: "c1", selfDeaf: true }), ns({ channelId: "c1" }), U, "deaf-off"],
  ["mute-on", st({ channelId: "c1" }), ns({ channelId: "c1", selfMute: true }), U, "mute-on"],
  ["mute-off", st({ channelId: "c1", selfMute: true }), ns({ channelId: "c1" }), U, "mute-off"],
  ["deaf-priority-over-mute", st({ channelId: "c1" }), ns({ channelId: "c1", selfDeaf: true, selfMute: true }), U, "deaf-on"],
  ["bot-self", st({ channelId: "c1" }), ns({}), BOT, "none:bot"],
  ["no-change", st({ channelId: "c1" }), ns({ channelId: "c1" }), U, "none:silent"],
];
let fail = 0;
for (const [name, o, n, t, want] of cases) {
  const got = decide(o, n, t);
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? "ok" : "FAIL"} ${name}: got=${got} want=${want}`);
}
console.log(fail === 0 ? `green ${cases.length}/${cases.length}` : `${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
