// W7 slice 61 battery: invitemanager/onInviteDelete.ts + onGuildLeave.ts verbatim.
function tsInviteDelete(invites, invite) {
  // client.invites.get(invite.guild?.id!)?.delete(invite.code);
  invites.get(invite.guild?.id)?.delete(invite.code);
}
function tsGuildLeave(invites, guildId) {
  // return client.invites.delete(guild.id);
  return invites.delete(guildId);
}
const results = [];
function snap(m) {
  const o = {};
  for (const [k, v] of m) o[k] = v instanceof Map ? [...v.keys()] : v;
  return JSON.stringify(o);
}
// D1: delete, guild present, code present
let m = new Map([["g1", new Map([["abc", 1], ["def", 2]])]]);
tsInviteDelete(m, { guild: { id: "g1" }, code: "abc" });
results.push(["D1 hit", snap(m) === '{"g1":["def"]}']);
// D2: delete, code absent -> no-op
m = new Map([["g1", new Map([["abc", 1]])]]);
tsInviteDelete(m, { guild: { id: "g1" }, code: "zzz" });
results.push(["D2 miss-code", snap(m) === '{"g1":["abc"]}']);
// D3: delete, guild absent from map -> no-op, no throw
m = new Map([["g1", new Map([["abc", 1]])]]);
tsInviteDelete(m, { guild: { id: "g9" }, code: "abc" });
results.push(["D3 miss-guild", snap(m) === '{"g1":["abc"]}']);
// D4: delete, invite.guild undefined -> get(undefined) miss, no-op
m = new Map([["g1", new Map([["abc", 1]])]]);
tsInviteDelete(m, { guild: undefined, code: "abc" });
results.push(["D4 no-guild", snap(m) === '{"g1":["abc"]}']);
// D5: delete empties inner map but keeps the guild row (Map.delete on inner, not outer)
m = new Map([["g1", new Map([["abc", 1]])]]);
tsInviteDelete(m, { guild: { id: "g1" }, code: "abc" });
results.push(["D5 row-kept", m.has("g1") && m.get("g1").size === 0]);
// L1: leave, guild present -> whole row dropped
m = new Map([["g1", new Map([["a", 1]])], ["g2", new Map([["b", 2]])]]);
const r1 = tsGuildLeave(m, "g1");
results.push(["L1 drop", r1 === true && snap(m) === '{"g2":["b"]}']);
// L2: leave, guild absent -> false, map untouched
m = new Map([["g2", new Map([["b", 2]])]]);
const r2 = tsGuildLeave(m, "g9");
results.push(["L2 miss", r2 === false && snap(m) === '{"g2":["b"]}']);
let fail = 0;
for (const [n, ok] of results) { if (!ok) { fail++; console.log("FAIL", n); } else console.log("ok", n); }
console.log(fail === 0 ? "GREEN 7/7" : `RED ${fail}`);
process.exit(fail === 0 ? 0 : 1);
