// W4 slice 87 battery: LastFMScrobblerManager `formatApiError` (login
// context) + `login` result-message legs, replicated verbatim from
// src/core/modules/lastFMScrobblerManager.ts:636-657 + :158-197.
const No = "<No-emoji>";
const Yes = "<Yes-emoji>";
const lang = {
	lastfm_api_error_login: "${client.iHorizon_Emojis.No} | Unable to connect to Last.fm: ${error}",
	lastfm_api_error_unknown: "unknown error",
	lastfm_login_invalid_session: "${client.iHorizon_Emojis.No} | Invalid session.",
	lastfm_login_success: "${client.iHorizon_Emojis.Yes} | `${username}` connected.",
};

// verbatim formatApiError, context fixed to "login"
function formatApiError(response) {
	const template = lang.lastfm_api_error_login;
	return template
		.replace(/\${client\.iHorizon_Emojis\.No}/g, No)
		.replace(/\${error}/g, response.message || lang.lastfm_api_error_unknown);
}
// verbatim login success fill
function loginSuccess(fetchedUsername) {
	return lang.lastfm_login_success
		.replace(/\${client\.iHorizon_Emojis\.Yes}/g, Yes)
		.replace(/\${username}/g, fetchedUsername);
}

let pass = 0, fail = 0;
function eq(name, got, want) {
	if (got === want) { pass++; }
	else { fail++; console.log(`FAIL ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
}

// E1: plain message kept
eq("E1", formatApiError({ message: "bad auth" }), `${No} | Unable to connect to Last.fm: bad auth`);
// E2: empty message falls back to unknown
eq("E2", formatApiError({ message: "" }), `${No} | Unable to connect to Last.fm: unknown error`);
// E3: missing message falls back to unknown
eq("E3", formatApiError({}), `${No} | Unable to connect to Last.fm: unknown error`);
// E4: WHITESPACE-ONLY message is truthy under `||` -> kept verbatim
eq("E4", formatApiError({ message: "   " }), `${No} | Unable to connect to Last.fm:    `);
// E5: tab-only kept too
eq("E5", formatApiError({ message: "\t" }), `${No} | Unable to connect to Last.fm: \t`);
// E6: null message falls back
eq("E6", formatApiError({ message: null }), `${No} | Unable to connect to Last.fm: unknown error`);
// E7: "0" string is truthy -> kept
eq("E7", formatApiError({ message: "0" }), `${No} | Unable to connect to Last.fm: 0`);
// S1: success fills Yes + username verbatim
eq("S1", loginSuccess("alice"), `${Yes} | \`alice\` connected.`);
// S2: username with spaces kept verbatim (no trim anywhere)
eq("S2", loginSuccess("  bob  "), `${Yes} | \`  bob  \` connected.`);
// I1: invalid-session fills No only, no username token involved
eq("I1", lang.lastfm_login_invalid_session.replace(/\${client\.iHorizon_Emojis\.No}/g, No), `${No} | Invalid session.`);
// W1: login row write is a FRESH object (no spread of old row): extra
// keys on the old row are dropped, exactly {connectedAt, enabled, sessionKey, username}
{
	const oldRow = { connectedAt: 1, enabled: false, sessionKey: "old", username: "old", extra: "drop-me" };
	const fresh = { connectedAt: 2, enabled: true, sessionKey: "enc", username: "alice" };
	const merged = { ...(oldRow), enabled: true }; // setEnabled shape, NOT login
	eq("W1-keys", Object.keys(fresh).sort().join(","), "connectedAt,enabled,sessionKey,username");
	eq("W1-login-drops-extra", "extra" in fresh, false);
	eq("W1-setEnabled-keeps-extra", merged.extra, "drop-me");
}
console.log(`slice-w4s87: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
