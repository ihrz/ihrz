const cases = [
  [9, "whatever", true],
  [null, "Invalid session key", true],
  [null, "Sessions expired, re-auth", true],   // plural: TS substring => true
  [null, "obsession detected", true],          // substring => true in TS
  [null, "SESSION EXPIRED", true],
  [4, "Authentication Failed", false],
  [null, "ok", false],
  [null, "", false],
  [undefined, undefined, false],
];
let fail = 0;
for (const [code, msg, want] of cases) {
  const got = (code === 9) || /session/i.test(msg || "");
  const ok = got === want;
  if (!ok) fail++;
  console.log(ok ? "PASS" : "FAIL", JSON.stringify({code, msg}), "got", got, "want", want);
}
// Rust word-match simulation
function rsWord(code, msg) {
  if (code === 9) return true;
  return (msg||"").toLowerCase().split(/[^a-z0-9]/).filter(Boolean).some(w => w === "session");
}
console.log("--- rust-word-match vs TS on plural/substring cases:");
for (const [code, msg, want] of cases) {
  const r = rsWord(code, msg);
  if (r !== want) console.log("DIVERGE", JSON.stringify(msg), "rust:", r, "ts:", want);
}
process.exit(fail ? 1 : 0);
