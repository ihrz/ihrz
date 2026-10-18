// W4 slice 69 battery: TS setEnabled + removeUserFromActiveSessions verbatim.
// Replicates src/core/modules/lastFMScrobblerManager.ts:117-138 + 620-628.
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; } else { fail++; console.log("FAIL:", name); } };

// --- minimal TS replica ---
const db = new Map(); // `${uid}.lastfm` -> row
const guildSessions = new Map(); // gid -> { listeners: Map }
const posts = []; // scrobble POSTs (tryScrobbleListener) — removeUser must never add here
function tryScrobbleListener(session, listener) { posts.push(listener.userId); }
function clearListenerTimeout(l) { l.timeout = undefined; }
function removeUserFromActiveSessions(userId) {
  for (const session of guildSessions.values()) {
    const listener = session.listeners.get(userId);
    if (!listener) continue;
    clearListenerTimeout(listener);
    session.listeners.delete(userId);
  }
}
async function setEnabled(userId, enabled) {
  const settings = db.get(`${userId}.lastfm`);
  if (enabled && (!settings?.sessionKey || !settings.username)) return { ok: false };
  db.set(`${userId}.lastfm`, { ...(settings || {}), enabled });
  if (!enabled) removeUserFromActiveSessions(userId);
  return { ok: true };
}
const mkListener = (uid) => ({ userId: uid, timeout: 1 });

(async () => {
// A: enable without any row -> {ok:false}, no row created
db.clear(); guildSessions.clear(); posts.length = 0;
ok("A enable-no-row false", (await setEnabled("u1", true)).ok === false);
ok("A no row written", !db.has("u1.lastfm"));

// B: enable with sessionKey but no username -> {ok:false}
db.set("u2.lastfm", { sessionKey: "enc", enabled: false });
ok("B enable-key-only false", (await setEnabled("u2", true)).ok === false);

// C: enable with full session -> {ok:true}, row merged, listeners untouched
db.set("u3.lastfm", { sessionKey: "enc", username: "bob", connectedAt: 123, enabled: false });
guildSessions.set("g1", { listeners: new Map([["u3", mkListener("u3")]]) });
ok("C enable-full true", (await setEnabled("u3", true)).ok === true);
ok("C row merged", JSON.stringify(db.get("u3.lastfm")) === JSON.stringify({ sessionKey: "enc", username: "bob", connectedAt: 123, enabled: true }));
ok("C listener kept", guildSessions.get("g1").listeners.has("u3"));

// D: disable drops listener from EVERY guild session, others kept, no POST
db.set("u4.lastfm", { sessionKey: "enc", username: "ann", connectedAt: 456, enabled: true });
guildSessions.set("g1", { listeners: new Map([["u4", mkListener("u4")], ["keep", mkListener("keep")]]) });
guildSessions.set("g2", { listeners: new Map([["u4", mkListener("u4")]]) });
ok("D disable true", (await setEnabled("u4", false)).ok === true);
ok("D dropped g1", !guildSessions.get("g1").listeners.has("u4"));
ok("D dropped g2", !guildSessions.get("g2").listeners.has("u4"));
ok("D other kept", guildSessions.get("g1").listeners.has("keep"));
ok("D row keeps key (vs invalidate)", db.get("u4.lastfm").sessionKey === "enc" && db.get("u4.lastfm").username === "ann" && db.get("u4.lastfm").connectedAt === 456 && db.get("u4.lastfm").enabled === false);
ok("D no finalize POST on disable", posts.length === 0);

// E: disable with no row -> creates {enabled:false}, {ok:true}
db.delete("u5.lastfm");
ok("E disable-no-row true", (await setEnabled("u5", false)).ok === true);
ok("E row created disabled", JSON.stringify(db.get("u5.lastfm")) === JSON.stringify({ enabled: false }));

// F: disable unknown listener is a no-op (still {ok:true})
guildSessions.set("g3", { listeners: new Map([["other", mkListener("other")]]) });
ok("F disable-no-listener true", (await setEnabled("u6", false)).ok === true);
ok("F others untouched", guildSessions.get("g3").listeners.has("other") && posts.length === 0);

console.log(`battery: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
