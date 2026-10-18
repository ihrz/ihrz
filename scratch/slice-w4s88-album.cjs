// W4 slice 88 battery: normalizeTrack album leg verbatim
// (lastFMScrobblerManager.ts) + signer empty-drop composition.
function normalizeTrack(track) {
  const pluginInfo = track.pluginInfo;
  return {
    album: pluginInfo?.albumName,
    artist: track.info.author,
    durationMs: track.info.isStream ? 0 : track.info.duration,
    title: track.info.title,
    url: track.info.uri,
  };
}
// callLastFM param-drop leg verbatim
function signDrop(params) {
  const out = {};
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  return out;
}
const base = { info: { author: "A", duration: 200000, isStream: false, title: "T", uri: "u" } };
const cases = [
  // [label, pluginInfo, expectAlbum, expectWired]
  ["undef", undefined, undefined, false],
  ["null", null, undefined, false],
  ["num", 5, undefined, false],
  ["str", "x", undefined, false],
  ["bool", true, undefined, false],
  ["arr", [], undefined, false],
  ["obj-noalbum", {}, undefined, false],
  ["album-undef", { albumName: undefined }, undefined, false],
  ["album-null", { albumName: null }, null, false], // TS keeps null -> dropped by signer (!= "")
  ["album-empty", { albumName: "" }, "", false],
  ["album-ws", { albumName: "  " }, "  ", true],
  ["album-zero", { albumName: 0 }, 0, true], // falsy-but-kept? 0 !== "" -> WIRED (number)
  ["album-num", { albumName: 123 }, 123, true],
  ["album-real", { albumName: "Alb" }, "Alb", true],
  ["album-inherit", Object.create({ albumName: "Inh" }), "Inh", true], // proto chain: ?. reads it
];
let fail = 0;
for (const [label, pi, expAlbum, expWired] of cases) {
  const t = { ...base, info: { ...base.info }, pluginInfo: pi };
  const n = normalizeTrack(t);
  const gotAlbum = n.album;
  const wired = Object.hasOwn(signDrop({ album: n.album }), "album");
  const okA = Object.is(gotAlbum, expAlbum) || (Number.isNaN(gotAlbum) && Number.isNaN(expAlbum));
  // null-proto check for inherit: Object.is still fine
  if (!okA || wired !== expWired) { console.log(`FAIL ${label}: album=${JSON.stringify(gotAlbum)} (exp ${JSON.stringify(expAlbum)}) wired=${wired} (exp ${expWired})`); fail++; }
  else console.log(`ok ${label}: album=${JSON.stringify(gotAlbum)} wired=${wired}`);
}
// null-prototype object leg: pluginInfo with null proto + own albumName
const np = Object.assign(Object.create(null), { albumName: "NP" });
const nnp = normalizeTrack({ ...base, info: { ...base.info }, pluginInfo: np });
console.log(`ok nullproto: album=${JSON.stringify(nnp.album)} wired=${Object.hasOwn(signDrop({ album: nnp.album }), "album")}`);
if (nnp.album !== "NP") { console.log("FAIL nullproto"); fail++; }
// stream leg still zeroes duration regardless of album
const st = normalizeTrack({ info: { author: "A", duration: 3600000, isStream: true, title: "T", uri: "u" }, pluginInfo: { albumName: "Alb" } });
if (st.durationMs !== 0 || st.album !== "Alb") { console.log("FAIL stream"); fail++; } else console.log("ok stream: duration 0 + album kept");
console.log(fail === 0 ? "ALL GREEN" : `${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
