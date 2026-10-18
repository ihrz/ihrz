// W4 slice 72 battery: TS getTrackKey filter/join legs verbatim.
function getTrackKey(track) {
  return [
    track.encoded,
    track.info.identifier,
    track.info.uri,
    track.info.title,
    track.info.author,
  ]
    .filter(Boolean)
    .join(":");
}
const cases = [
  // [name, track, expected]
  ["all-present", { encoded: "enc", info: { identifier: "id1", uri: "http://u", title: "T", author: "A" } }, "enc:id1:http://u:T:A"],
  ["missing-uri", { encoded: "enc", info: { identifier: "id1", uri: undefined, title: "T", author: "A" } }, "enc:id1:T:A"],
  ["null-encoded", { encoded: null, info: { identifier: "id1", uri: "u", title: "T", author: "A" } }, "id1:u:T:A"],
  ["empty-title-dropped", { encoded: "enc", info: { identifier: "id1", uri: "u", title: "", author: "A" } }, "enc:id1:u:A"],
  ["zero-string-kept", { encoded: "enc", info: { identifier: "0", uri: "u", title: "T", author: "A" } }, "enc:0:u:T:A"],
  ["all-empty", { encoded: "", info: { identifier: "", uri: "", title: "", author: "" } }, ""],
  ["replay-same-key", { encoded: "enc", info: { identifier: "id1", uri: "u", title: "T", author: "A" } }, "enc:id1:u:T:A"],
  ["colon-in-field", { encoded: "a:b", info: { identifier: "c", uri: "u", title: "T", author: "A" } }, "a:b:c:u:T:A"],
  ["distinct-track", { encoded: "enc2", info: { identifier: "id1", uri: "u", title: "T", author: "A" } }, "enc2:id1:u:T:A"],
  ["author-only-diff", { encoded: "enc", info: { identifier: "id1", uri: "u", title: "T", author: "B" } }, "enc:id1:u:T:B"],
];
let pass = 0;
for (const [name, track, expected] of cases) {
  const got = getTrackKey(track);
  const ok = got === expected;
  if (ok) pass++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${JSON.stringify(got)}${ok ? "" : ` expected ${JSON.stringify(expected)}`}`);
}
// Replay indistinguishability: same track object twice -> identical keys.
const t = { encoded: "enc", info: { identifier: "id1", uri: "u", title: "T", author: "A" } };
const replaySame = getTrackKey(t) === getTrackKey({ ...t, info: { ...t.info } });
console.log(`${replaySame ? "PASS" : "FAIL"} replay-indistinguishable: ${replaySame}`);
if (replaySame) pass++;
console.log(`${pass}/${cases.length + 1} green`);
process.exit(pass === cases.length + 1 ? 0 : 1);
