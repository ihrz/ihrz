// W7 slice 26 battery: replicates src/Events/utils/picOnlyModule.ts verbatim.
const validMediaTypes = ["image/jpeg","image/png","image/gif","image/webp","image/bmp","image/tiff","video/x-matroska","video/mp4","video/webm","video/quicktime"];
const hasMedia = (cts) => cts.some((ct) => ct && validMediaTypes.includes(ct.toLowerCase()));
const mediaCases = [
  ["image/png", true], ["IMAGE/PNG", true], ["Image/Jpeg", true],
  ["video/x-matroska", true], ["VIDEO/X-MATROSKA", true],
  ["video/x-matros\u212aA", true], // Kelvin sign lowercases to 'k' -> hit
  ["text/plain", false], [" image/png", false], ["image/png ", false],
  ["image/png; charset=utf-8", false], ["", false], [null, false], [undefined, false],
  ["image/jpg", false], ["video/avi", false], ["video/quicktime", true], ["image/tiff", true],
];
let fail = 0;
for (const [ct, want] of mediaCases) {
  const got = hasMedia([ct]);
  if (got !== want) { console.log("MEDIA MISS", JSON.stringify(ct), got, want); fail++; }
}
if (!hasMedia(["text/plain", "IMAGE/GIF"])) { console.log("MEDIA MISS multi"); fail++; }
if (hasMedia([])) { console.log("MEDIA MISS empty"); fail++; }

// channel gate: picOnlyChannels?.includes(channelId)
const gate = (row, ch) => row?.includes(ch) ?? false;
if (gate(null, "c1") !== false) { console.log("GATE MISS null"); fail++; }
if (gate(undefined, "c1") !== false) { console.log("GATE MISS undef"); fail++; }
if (gate(["c1"], "c1") !== true || gate(["c1"], "c2") !== false) { console.log("GATE MISS arr"); fail++; }

// cleanOldWarnings: filter t > now-600000; empty -> delete key
const clean = (warns, now) => {
  const r = warns.filter((t) => t > now - 10 * 60 * 1000);
  return r.length === 0 ? null : r; // null == key deleted
};
const NOW = 1_000_000;
if (JSON.stringify(clean([999999], NOW)) !== "[999999]") { console.log("CLEAN MISS keep"); fail++; }
if (clean([400000], NOW) !== null) { console.log("CLEAN MISS exact-600s-kept"); fail++; }
if (clean([399999], NOW) !== null) { console.log("CLEAN MISS old"); fail++; }
if (JSON.stringify(clean([1000001], NOW)) !== "[1000001]") { console.log("CLEAN MISS future"); fail++; }

// threshold || 3 ; strike trigger hardcoded >= 3
const thr = (c) => c.threshold || 3;
if (thr({threshold: 0}) !== 3 || thr({threshold: -5}) !== -5 || thr({threshold: 10}) !== 10) { console.log("THR MISS num"); fail++; }
if (thr({threshold: NaN}) !== 3 || thr({}) !== 3 || thr({threshold: ""}) !== 3) { console.log("THR MISS falsy"); fail++; }
if (thr({threshold: "5"}) !== "5") { console.log("THR MISS str"); fail++; }
const punish = (warnLen) => warnLen >= 3; // hardcoded, ignores threshold
if (!punish(3) || punish(2)) { console.log("STRIKE MISS"); fail++; }

// muteTime || 600000
const mute = (c) => c.muteTime || 10 * 60 * 1000;
if (mute({muteTime: 0}) !== 600000 || mute({muteTime: -1000}) !== -1000 || mute({muteTime: 5000}) !== 5000 || mute({}) !== 600000) { console.log("MUTE MISS"); fail++; }

// displayName chain: member?.displayName || member?.nickname ; String()
const disp = (m) => String(m?.displayName || m?.nickname);
if (disp({displayName: "N", nickname: "K"}) !== "N") { console.log("DISP MISS nick"); fail++; }
if (disp({displayName: undefined, nickname: "K"}) !== "K") { console.log("DISP MISS global-via-display"); fail++; }
if (disp(null) !== "undefined") { console.log("DISP MISS nullmember"); fail++; }

// createThread === "yes" strict
const ct = (c) => c?.createThread === "yes";
if (!ct({createThread: "yes"}) || ct({createThread: "no"}) || ct({createThread: "YES"}) || ct({}) || ct(null) || ct({createThread: true})) { console.log("CT MISS"); fail++; }

// String.replace(string) is first-only
const t = "Hi ${x} and ${x}";
if (t.replace("${x}", "A") !== "Hi A and ${x}") { console.log("REPLACE MISS"); fail++; }

console.log(fail === 0 ? "BATTERY GREEN" : `BATTERY FAILURES: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
