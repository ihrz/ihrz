// W4 slice 68 battery: lastFMScrobblerManager.ts createApiSignature +
// callLastFM param-drop/error-mapping + formatApiError legs, verbatim.
const { createHash } = require("node:crypto");

let pass = 0, fail = 0;
function eq(name, a, b) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa === sb) { pass++; }
  else { fail++; console.log(`FAIL ${name}: got ${sa} want ${sb}`); }
}

// --- createApiSignature verbatim ---
function createApiSignature(params, sharedSecret) {
  const payload = Object.keys(params)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${key}${params[key]}`)
    .join("");
  return createHash("md5").update(payload + sharedSecret, "utf8").digest("hex");
}

// 1. Real scrobble param set (camelCase chosenByUser present).
const scrobbleParams = {
  api_key: "K", method: "track.scrobble", album: "Alb", artist: "Art",
  chosenByUser: "1", duration: "200", sk: "SK", timestamp: "1700000000", track: "Title",
};
const tsSig = createApiSignature(scrobbleParams, "SECRET");
console.log("TS_SIG_SCROBBLE=" + tsSig);
console.log("TS_SORT_ORDER=" + Object.keys(scrobbleParams).sort((a, b) => a.localeCompare(b)).join(","));
// byte-sort order for comparison
console.log("BYTE_SORT_ORDER=" + Object.keys(scrobbleParams).sort().join(","));

// 2. Login param set.
const loginParams = { api_key: "K", method: "auth.getMobileSession", username: "u", password: "p" };
console.log("TS_SIG_LOGIN=" + createApiSignature(loginParams, "SECRET"));

// 3. Non-ASCII value md5 utf8 leg.
console.log("TS_SIG_UNICODE=" + createApiSignature({ api_key: "K", method: "m", track: "héllo→" }, "S"));

// --- callLastFM param-drop verbatim ---
function dropParams(params) {
  const signed = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") signed[key] = value;
  }
  return signed;
}
eq("drop-empty", dropParams({ album: "", artist: "A", duration: undefined, sk: "S", track: "T", x: null }), { artist: "A", sk: "S", track: "T" });
eq("keep-zero-string", dropParams({ duration: "0" }), { duration: "0" });

// --- callLastFM error mapping verbatim ---
function mapError(statusOk, status, statusText, rawBody) {
  const payload = rawBody ? JSON.parse(rawBody) : {};
  if (!statusOk || payload.error) {
    return { ok: false, errorCode: payload.error ? Number(payload.error) : status, message: payload.message || statusText };
  }
  return { ok: true, data: payload };
}
eq("api-err-9", mapError(true, 200, "OK", JSON.stringify({ error: 9, message: "Invalid session key" })), { ok: false, errorCode: 9, message: "Invalid session key" });
eq("http-500-nobody", mapError(false, 500, "Internal Server Error", ""), { ok: false, errorCode: 500, message: "Internal Server Error" });
eq("http-403-err-member", mapError(false, 403, "Forbidden", JSON.stringify({ error: 4, message: "Auth failed" })), { ok: false, errorCode: 4, message: "Auth failed" });
eq("ok-payload", mapError(true, 200, "OK", JSON.stringify({ session: { name: "n" } })).ok, true);
eq("error-0-falsy", mapError(true, 200, "OK", JSON.stringify({ error: 0 })).ok, true);
eq("missing-message", mapError(false, 404, "Not Found", JSON.stringify({ error: 4 })), { ok: false, errorCode: 4, message: "Not Found" });
eq("string-error-code", mapError(true, 200, "OK", JSON.stringify({ error: "9", message: "m" })), { ok: false, errorCode: 9, message: "m" });

// --- formatApiError template pick verbatim ---
function pickTemplate(context) {
  return context === "login" ? "LOGIN" : context === "nowPlaying" ? "NOW" : "SCROBBLE";
}
eq("tmpl-login", pickTemplate("login"), "LOGIN");
eq("tmpl-now", pickTemplate("nowPlaying"), "NOW");
eq("tmpl-scrobble", pickTemplate("scrobble"), "SCROBBLE");
function fillError(template, message, unknown) {
  return template.replace(/\${error}/g, message || unknown);
}
eq("fill-msg", fillError("E: ${error}", "boom", "unknown"), "E: boom");
eq("fill-unknown", fillError("E: ${error}", "", "unknown"), "E: unknown");
eq("fill-undefined", fillError("E: ${error}", undefined, "unknown"), "E: unknown");

console.log(`\nBATTERY ${pass} passed ${fail} failed`);
process.exit(fail ? 1 : 0);
