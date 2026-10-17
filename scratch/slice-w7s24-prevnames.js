// W7 slice 24 battery: prevnamesModule.ts (userUpdate) +
// prevnamesModuleGuild.ts (guildMemberUpdate) verbatim legs.
const results = [];
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const ok = a === e;
  results.push([ok ? "PASS" : "FAIL", name, a, e]);
}
// ---- userUpdate verbatim ----
function userUpdate(cached, oldUser, newUser) {
  const previousUsername = cached?.username ?? oldUser.username;
  const previousGlobalName = cached?.globalName ?? oldUser.globalName;
  const changes = [];
  if (previousUsername !== newUser.username) changes.push({ type: "username", oldValue: previousUsername });
  if (previousGlobalName !== newUser.globalName && previousGlobalName !== null && previousGlobalName !== undefined)
    changes.push({ type: "globalName", oldValue: previousGlobalName });
  const entries = changes.map((c) => `<t:123:d> - [${c.type}] ${c.oldValue}`);
  const nextCache = { username: newUser.username, globalName: newUser.globalName };
  return { changes, entries, nextCache };
}
let r = userUpdate(undefined, { username: "a", globalName: null }, { username: "b", globalName: null });
check("user: name change, global null/null", r.changes, [{ type: "username", oldValue: "a" }]);
r = userUpdate(undefined, { username: "a", globalName: null }, { username: "a", globalName: null });
check("user: no change", r.changes, []);
r = userUpdate(undefined, { username: "a", globalName: null }, { username: "a", globalName: "x" });
check("user: null->x global blocked", r.changes, []);
r = userUpdate(undefined, { username: "a", globalName: "x" }, { username: "a", globalName: null });
check("user: x->null global records old", r.changes, [{ type: "globalName", oldValue: "x" }]);
r = userUpdate(undefined, { username: "a", globalName: "x" }, { username: "a", globalName: "y" });
check("user: x->y global records old", r.changes, [{ type: "globalName", oldValue: "x" }]);
r = userUpdate({ username: "cached", globalName: "cg" }, { username: "old", globalName: "og" }, { username: "new", globalName: "ng" });
check("user: cache-first oldValues", r.changes, [{ type: "username", oldValue: "cached" }, { type: "globalName", oldValue: "cg" }]);
r = userUpdate({ username: undefined, globalName: undefined }, { username: "o", globalName: "g" }, { username: "n", globalName: "g2" });
check("user: undefined cached fields fall to old", r.changes, [{ type: "username", oldValue: "o" }, { type: "globalName", oldValue: "g" }]);
r = userUpdate({ username: "same", globalName: null }, { username: "x", globalName: null }, { username: "same", globalName: null });
check("user: cache-hit no change", r.changes, []);
check("user: trailing cache always refreshes", r.nextCache, { username: "same", globalName: null });
r = userUpdate(undefined, { username: "a", globalName: null }, { username: "b", globalName: null });
check("user: entry format", r.entries, ["<t:123:d> - [username] a"]);
// ---- guildMemberUpdate verbatim ----
function memberUpdate(nickMap, oldNick, newNick, guildId, guildName) {
  const cachedGuildNicks = nickMap?.get("u");
  const previousNickname = cachedGuildNicks?.get(guildId) ?? oldNick;
  if (previousNickname === newNick) return { action: "early-return", map: nickMap };
  const m = nickMap ?? new Map();
  const gm = m.get("u") ?? new Map();
  gm.set(guildId, newNick);
  m.set("u", gm);
  if (previousNickname === null || previousNickname === undefined) return { action: "map-only", map: m };
  return { action: "record", old: previousNickname, entry: `<t:123:d> - [nickname:${guildName}] ${previousNickname}`, map: m };
}
r = memberUpdate(undefined, null, "x", "g", "Guild");
check("nick: null->x map-only", r.action, "map-only");
check("nick: null->x map refreshed", r.map.get("u").get("g"), "x");
r = memberUpdate(undefined, "a", "b", "g", "Guild");
check("nick: a->b records", [r.action, r.old], ["record", "a"]);
check("nick: entry format", r.entry, "<t:123:d> - [nickname:Guild] a");
r = memberUpdate(undefined, "a", "a", "g", "Guild");
check("nick: same early-return", r.action, "early-return");
const stale = new Map([["u", new Map([["g", "stale"]])]]);
r = memberUpdate(stale, "s", "s", "g", "Guild");
check("nick: cache-first beats same old/new (records stale)", [r.action, r.old], ["record", "stale"]);
r = memberUpdate(new Map([["u", new Map([["g", "c"]])]]), "o", "n", "g", "Guild");
check("nick: cache-first over old", r.old, "c");
r = memberUpdate(new Map([["u", new Map([["g", null]])]]), "o", "n", "g", "Guild");
check("nick: cached-null falls to old via ??", r.old, "o");
r = memberUpdate(new Map([["u", new Map([["g", null]])]]), null, "x", "g", "Guild");
check("nick: cached-null + old-null map-only", r.action, "map-only");
r = memberUpdate(undefined, "a", null, "g", "Guild");
check("nick: a->null records old", [r.action, r.old], ["record", "a"]);
const fails = results.filter(([s]) => s === "FAIL");
for (const [s, n, a, e] of results) console.log(s, n, s === "FAIL" ? `got=${a} want=${e}` : "");
console.log(`${results.length - fails.length}/${results.length} green`);
process.exit(fails.length ? 1 : 0);
