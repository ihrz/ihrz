// W4 slice 75 battery: lastFMScrobblerManager.ts `login` session-extraction legs.
// Replicates verbatim:
//   const fetchedUsername = response.data?.session?.name;
//   const sessionKey = response.data?.session?.key;
//   if (!fetchedUsername || !sessionKey) -> invalid_session
// (`data` is the whole payload on the ok leg: `return { data: payload, ok: true }`.)
function tsLoginGate(payload) {
    const data = payload;
    const fetchedUsername = data?.session?.name;
    const sessionKey = data?.session?.key;
    if (!fetchedUsername || !sessionKey) return { ok: false, leg: "invalid_session" };
    return { ok: true, username: fetchedUsername, key: sessionKey };
}
const cases = [
    ["full", { session: { name: "kisa_fm", key: "SK123" } }],
    ["no-session", {}],
    ["null-session", { session: null }],
    ["missing-key", { session: { name: "u" } }],
    ["missing-name", { session: { key: "k" } }],
    ["empty-name", { session: { name: "", key: "k" } }],
    ["empty-key", { session: { name: "u", key: "" } }],
    ["numeric-name", { session: { name: 12345, key: "k" } }],
    ["zero-key", { session: { name: "u", key: 0 } }],
    ["space-name", { session: { name: " ", key: "k" } }],
    ["string-session", { session: "x" }],
    ["null-name", { session: { name: null, key: "k" } }],
    ["bool-name", { session: { name: true, key: "k" } }],
    ["nested-extra", { session: { name: "u", key: "k", subscriber: "1" }, extra: 1 }],
];
for (const [label, payload] of cases) {
    const r = tsLoginGate(payload);
    console.log(label + " => " + JSON.stringify(r));
}
