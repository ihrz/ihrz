// W4 slice-98 battery: lastFMScrobblerManager.ts `setEnabled` gate +
// merge-write + disable-drop legs, replicated verbatim.
function setEnabled(settings, enabled) {
  if (enabled && (!settings?.sessionKey || !settings.username)) return { ok: false };
  const row = { ...(settings || {}), enabled };
  return { ok: true, row, drop: !enabled };
}
const cases = [
  // [label, settings, enabled, expectOk, expectRow, expectDrop]
  ["E1 enable+null denies", null, true, false],
  ["E2 enable+undefined denies", undefined, true, false],
  ["E3 enable+{} denies", {}, true, false],
  ["E4 enable key-only denies", { sessionKey: "k" }, true, false],
  ["E5 enable username-only denies", { username: "u" }, true, false],
  ["E6 enable empty-key denies", { sessionKey: "", username: "u" }, true, false],
  ["E7 enable empty-username denies", { sessionKey: "k", username: "" }, true, false],
  ["E8 enable full merges", { sessionKey: "k", username: "u", connectedAt: 123, enabled: false }, true, true, { sessionKey: "k", username: "u", connectedAt: 123, enabled: true }, false],
  ["E9 disable+null writes", null, false, true, { enabled: false }, true],
  ["E10 disable keeps sessionKey", { sessionKey: "k", username: "u", connectedAt: 7, enabled: true }, false, true, { sessionKey: "k", username: "u", connectedAt: 7, enabled: false }, true],
  ["E11 enable whitespace-key proceeds", { sessionKey: " ", username: "u" }, true, true, { sessionKey: " ", username: "u", enabled: true }, false],
  ["E12 enable keeps extras", { sessionKey: "k", username: "u", extra: 1 }, true, true, { sessionKey: "k", username: "u", extra: 1, enabled: true }, false],
  ["E13 disable+{} writes", {}, false, true, { enabled: false }, true],
  ["E14 zero-key denies", { sessionKey: 0, username: "u" }, true, false],
];
let fail = 0;
for (const [label, s, en, ok, row, drop] of cases) {
  const r = setEnabled(s, en);
  const good = r.ok === !!ok &&
    (row === undefined || JSON.stringify(r.row) === JSON.stringify(row)) &&
    (drop === undefined || r.drop === drop);
  if (!good) { fail++; console.log("FAIL", label, JSON.stringify(r)); }
  else console.log("ok", label);
}
console.log(fail === 0 ? "BATTERY GREEN 14/14" : `BATTERY ${14 - fail}/14`);
process.exit(fail ? 1 : 0);
