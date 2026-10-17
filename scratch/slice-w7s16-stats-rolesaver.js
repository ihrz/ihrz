// W7 slice 16 battery: stats/onNewMessage gate, stats/onVoiceUpdate
// routing + processSessionEnd coins, rolesaver join/leave legs.
let pass = 0, fail = 0;
function eq(name, got, want) {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a === b) { pass++; } else { fail++; console.log(`FAIL ${name}: got ${a} want ${b}`); }
}

// --- stats/onNewMessage.ts: if (!message.guild || message.author.bot || !message.channel) return;
function statsGate(msg) { return !(!msg.guild || msg.author.bot || !msg.channel); }
eq("stats-ok", statsGate({guild: 1, author: {bot: false}, channel: 1}), true);
eq("stats-noguild", statsGate({guild: null, author: {bot: false}, channel: 1}), false);
eq("stats-undefguild", statsGate({author: {bot: false}, channel: 1}), false);
eq("stats-bot", statsGate({guild: 1, author: {bot: true}, channel: 1}), false);
eq("stats-nochannel", statsGate({guild: 1, author: {bot: false}, channel: null}), false);
eq("stats-webhook-botfalse", statsGate({guild: 1, author: {bot: false}, channel: 1}), true);
// contentLength = UTF-16 units
eq("stats-u16-emoji", "a😀b".length, 4);
eq("stats-u16-accent", "é".length, 1);

// --- stats/onVoiceUpdate.ts routing
// leg1: userId && newChannelId && oldChannelId !== newChannelId (join OR move)
// leg2: userId && oldChannelId && !newChannelId (leave)
function route(oldCh, newCh) {
  const userId = "123";
  if (userId && newCh && oldCh !== newCh) return "open";
  if (userId && oldCh && !newCh) return "close";
  return "ignore";
}
eq("voice-join", route(undefined, "A"), "open");
eq("voice-join-nullold", route(null, "A"), "open");
eq("voice-move", route("A", "B"), "open");
eq("voice-leave", route("A", null), "close");
eq("voice-leave-undef", route("A", undefined), "close");
eq("voice-toggle", route("A", "A"), "ignore");
eq("voice-none", route(null, null), "ignore");
eq("voice-undef-undef", route(undefined, undefined), "ignore");
eq("voice-empty-new", route("A", ""), "close"); // "" falsy -> leave leg

// --- processSessionEnd coins: floor(ms/1000/60/10), pay iff >0 && member
function sessionCoins(startMs, endMs, member, boost) {
  const dur = endMs - startMs;
  const mins = dur / 1000 / 60;
  const earned = Math.floor(mins / 10);
  if (earned > 0 && member) return earned * boost;
  return 0; // skipped
}
const B = (highest) => highest || 1; // getMemberBoost tail
eq("coins-9.99min", sessionCoins(0, 599999, {}, 1), 0);
eq("coins-10min", sessionCoins(0, 600000, {}, 1), 1);
eq("coins-25.5min", sessionCoins(0, 1530000, {}, 2), 4);
eq("coins-negdur", sessionCoins(9999999, 0, {}, 1), 0);
eq("coins-nomember", sessionCoins(0, 600000, null, 1), 0);
eq("coins-member-undef", sessionCoins(0, 600000, undefined, 1), 0);
eq("coins-boost-half", sessionCoins(0, 600000, {}, 0.5), 0.5); // NOT 1
eq("coins-boost-neg", sessionCoins(0, 600000, {}, -2), -2);   // debit, NOT clamp
eq("coins-boost-zero", B(0), 1);
eq("coins-boost-neg-passthru", B(-2), -2);
eq("coins-boost-nan", B(NaN), 1);
// float-minute truncation equivalence: floor(m/10) vs floor(floor(m)/10)
for (const ms of [599999, 600000, 601234, 3599999, 3600000, 86399999]) {
  const m = ms / 1000 / 60;
  eq(`coins-trunc-${ms}`, Math.floor(m / 10), Math.floor(Math.floor(m) / 10));
}

// --- rolesaver/onMemberLeave.ts snapshot
const ADMIN = 8n;
function snap(roles, everyoneId, admin) {
  const out = [];
  for (const r of roles) {
    if (r.id === everyoneId) continue;
    if ((r.perms & ADMIN) === ADMIN && admin === "no") continue;
    out.push(r.id);
  }
  return out;
}
const R = (id, admin) => ({id, perms: admin ? ADMIN : 0n});
eq("snap-basic", snap([R("1", false), R("2", false)], "1", "yes"), ["2"]);
eq("snap-admin-yes-keeps", snap([R("1", false), R("2", true)], "1", "yes"), ["2"]);
eq("snap-admin-no-skips", snap([R("1", false), R("2", true)], "1", "no"), []);
eq("snap-admin-missing-keeps", snap([R("2", true)], "1", undefined), ["2"]);
eq("snap-admin-No-keeps", snap([R("2", true)], "1", "No"), ["2"]); // strict ===
eq("snap-admin-empty-keeps", snap([R("2", true)], "1", ""), ["2"]);
eq("snap-empty", snap([], "1", "no"), []);
eq("snap-only-everyone", snap([R("1", false)], "1", "no"), []);

// --- rolesaver/onMemberJoin.ts: if (!array || array.length === 0) return;
function joinActs(array) {
  if (!array || array.length === 0) return "skip";
  return "set+delete";
}
eq("join-null", joinActs(null), "skip");
eq("join-undef", joinActs(undefined), "skip");
eq("join-empty", joinActs([]), "skip");
eq("join-one", joinActs(["5"]), "set+delete");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
