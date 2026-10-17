// W7 slice 28 battery: nickKicker.ts gate + 3-leg match, verbatim TS semantics.
function gate(baseData) {
  return !!(baseData?.enabled);
}
function trips(baseData, username, displayName, globalName) {
  return (
    baseData.words.some((word) =>
      username.toLowerCase().includes(word.toLowerCase())
    ) ||
    baseData.words.some((word) =>
      displayName?.toLowerCase().includes(word.toLowerCase())
    ) ||
    baseData.words.some((word) =>
      globalName?.toLowerCase().includes(word.toLowerCase())
    )
  );
}
function verdict(baseData, u, d, g) {
  if (baseData == null) return false; // ?.enabled falsy
  if (!gate(baseData)) return false;
  try {
    return trips(baseData, u, d, g);
  } catch {
    return false; // TS outer try/catch -> return (words missing throws)
  }
}
const cases = [
  // [label, baseData, username, displayName, globalName, expected]
  ["basic-username-hit", { enabled: true, words: ["bad"] }, "xBadx", "xBadx", null, true],
  ["display-hit", { enabled: true, words: ["bad"] }, "ok", "myBADname", null, true],
  ["global-hit", { enabled: true, words: ["bad"] }, "ok", "ok", "The Bad One", true],
  ["no-hit", { enabled: true, words: ["bad"] }, "ok", "fine", "Fine Name", false],
  ["empty-words", { enabled: true, words: [] }, "bad", "bad", null, false],
  ["disabled", { enabled: false, words: ["bad"] }, "bad", "bad", "bad", false],
  ["null-basedata", null, "bad", "bad", "bad", false],
  ["enabled-1-truthy", { enabled: 1, words: ["bad"] }, "bad", "bad", null, true],
  ["enabled-str-false-truthy", { enabled: "false", words: ["bad"] }, "bad", "bad", null, true],
  ["enabled-0-falsy", { enabled: 0, words: ["bad"] }, "bad", "bad", null, false],
  ["enabled-undefined", { words: ["bad"] }, "bad", "bad", null, false],
  ["words-missing-throws", { enabled: true }, "bad", "bad", null, false],
  ["empty-word-trips-all", { enabled: true, words: [""] }, "anyone", "nope", "nothing", true],
  ["display-null-falls-to-global", { enabled: true, words: ["bad"] }, "ok", null, "bad guy", true],
  ["both-null-no-trip", { enabled: true, words: ["bad"] }, "ok", null, null, false],
  ["unicode-e-acute", { enabled: true, words: ["café"] }, "CAFÉ lover", "x", null, true],
  ["unicode-e-acute-word-upper", { enabled: true, words: ["CAFÉ"] }, "café lover", "x", null, true],
  ["turkish-dotless", { enabled: true, words: ["KISAKAY"] }, "kisakay", "x", null, true],
  ["german-ss", { enabled: true, words: ["strasse"] }, "Strasse", "x", null, true],
  ["greek-sigma-final", { enabled: true, words: ["σ"] }, "ΟΣ", "x", null, false],
  ["kelvin", { enabled: true, words: ["k"] }, "K", "x", null, true],
  ["substr-not-whole", { enabled: true, words: ["bad"] }, "badminton", "x", null, true],
  ["case-word-mixed", { enabled: true, words: ["bAd"] }, "xxbadxx", "x", null, true],
];
let fail = 0;
for (const [label, bd, u, d, g, exp] of cases) {
  // discord.js displayName = globalName ?? username when not provided; here pass explicit
  const got = verdict(bd, u, d ?? g ?? u, g);
  const ok = got === exp;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: got=${got} exp=${exp}`);
}
// unicode probe: what does JS toLowerCase do on these (for Rust comparison)?
for (const s of ["É", "CAFÉ", "ΟΣ", "K", "İ", "ß"]) {
  console.log(`lower ${JSON.stringify(s)} -> ${JSON.stringify(s.toLowerCase())}`);
}
console.log(fail === 0 ? "BATTERY GREEN" : `BATTERY ${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
