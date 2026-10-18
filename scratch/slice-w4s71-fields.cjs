// W4 slice 71 battery: updateNowPlaying / scrobbleTrack param-construction
// legs, verbatim from src/core/modules/lastFMScrobblerManager.ts.
// Replicates: duration `ms > 0 ? floor(ms/1000).toString() : undefined`,
// scrobble-only chosenByUser/timestamp, and the callLastFM
// `value !== undefined && !== null && !== ""` signer drop.
function buildUpdateNowPlaying(track, sessionKey) {
  return {
    album: track.album,
    artist: track.artist,
    duration:
      track.durationMs > 0
        ? Math.floor(track.durationMs / 1000).toString()
        : undefined,
    sk: sessionKey,
    track: track.title,
  };
}
function buildScrobble(listener, track) {
  return {
    album: track.album,
    artist: track.artist,
    chosenByUser: "1",
    duration:
      track.durationMs > 0
        ? Math.floor(track.durationMs / 1000).toString()
        : undefined,
    sk: listener.sessionKey,
    timestamp: Math.floor(listener.startedAt / 1000).toString(),
    track: track.title,
  };
}
function sign(params) {
  const out = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}
let pass = 0, fail = 0;
function eq(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.log(`FAIL ${name}: got ${a} want ${e}`); }
}
// 1. Full-length now-playing keeps duration as whole seconds.
eq("np-180s", sign(buildUpdateNowPlaying(
  { album: undefined, artist: "a", durationMs: 180000, title: "t" }, "sk")),
  { artist: "a", duration: "180", sk: "sk", track: "t" });
// 2. Sub-second remainder floors, never rounds (29999 -> "29").
eq("np-floor", sign(buildUpdateNowPlaying(
  { album: undefined, artist: "a", durationMs: 29999, title: "t" }, "sk")).duration, "29");
// 3. 999ms -> "0", and "0" is KEPT by the signer (only "" drops).
eq("np-zero-kept", sign(buildUpdateNowPlaying(
  { album: undefined, artist: "a", durationMs: 999, title: "t" }, "sk")).duration, "0");
// 4. Zero-length (stream) drops duration entirely.
eq("np-stream-drop", "duration" in sign(buildUpdateNowPlaying(
  { album: undefined, artist: "a", durationMs: 0, title: "t" }, "sk")), false);
// 5. Album present is kept; absent is dropped.
eq("np-album-kept", sign(buildUpdateNowPlaying(
  { album: "alb", artist: "a", durationMs: 60000, title: "t" }, "sk")).album, "alb");
// 6. Now-playing carries no timestamp / chosenByUser.
const npKeys = Object.keys(sign(buildUpdateNowPlaying(
  { album: undefined, artist: "a", durationMs: 60000, title: "t" }, "sk")));
eq("np-no-ts", npKeys.includes("timestamp"), false);
eq("np-no-cbu", npKeys.includes("chosenByUser"), false);
// 7. Scrobble always carries chosenByUser=1 + per-listener timestamp.
const sc = sign(buildScrobble({ sessionKey: "sk", startedAt: 1700000000123 },
  { album: undefined, artist: "a", durationMs: 200000, title: "t" }));
eq("sc-cbu", sc.chosenByUser, "1");
eq("sc-ts", sc.timestamp, "1700000000");
eq("sc-dur", sc.duration, "200");
// 8. Scrobble of a stream drops duration but keeps timestamp/cbu.
const scStream = sign(buildScrobble({ sessionKey: "sk", startedAt: 500 },
  { album: undefined, artist: "a", durationMs: 0, title: "t" }));
eq("sc-stream-nodur", "duration" in scStream, false);
eq("sc-stream-ts", scStream.timestamp, "0");
console.log(`battery: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
