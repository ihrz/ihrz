// W4 slice 76 battery: hasUserSession + setEnabled enable-gate verbatim.
function hasUserSession(settings) {
  return Boolean(settings?.sessionKey && settings?.username);
}
function enableGateBlocks(settings) {
  const enabled = true;
  return enabled && (!settings?.sessionKey || !settings.username);
}
const cases = [
  ["null", null],
  ["undefined", undefined],
  ["empty-obj", {}],
  ["key-only", { sessionKey: "k" }],
  ["user-only", { username: "u" }],
  ["both", { sessionKey: "k", username: "u" }],
  ["empty-key", { sessionKey: "", username: "u" }],
  ["empty-user", { sessionKey: "k", username: "" }],
  ["both-empty", { sessionKey: "", username: "" }],
  ["ws-key", { sessionKey: " ", username: "u" }],
  ["zero-key", { sessionKey: 0, username: "u" }],
  ["num-key", { sessionKey: 12345, username: "u" }],
  ["bool-key", { sessionKey: true, username: "u" }],
  ["null-key", { sessionKey: null, username: "u" }],
];
let pass = 0;
for (const [name, s] of cases) {
  const h = hasUserSession(s);
  const g = enableGateBlocks(s);
  const ok = (h === !g);
  if (ok) pass++;
  console.log(`${ok ? "ok" : "FAIL"} ${name}: has=${h} gateBlocks=${g}`);
}
console.log(`${pass}/${cases.length} green`);
