// W4 slice 90 battery: normalizeTrack base-field mapping + isConfigured
// truthiness + getMissingConfigurationMessage global-replace, verbatim.
function normalizeTrack(track) {
	const pluginInfo = track.pluginInfo;
	return {
		album: pluginInfo?.albumName,
		artist: track.info.author,
		durationMs: track.info.isStream ? 0 : track.info.duration,
		title: track.info.title,
		url: track.info.uri
	};
}
function isConfigured(apiKey, sharedSecret) {
	return Boolean(apiKey && sharedSecret);
}
const NO_TOKEN = "${client.iHorizon_Emojis.No}";
function getMissingConfigurationMessage(tpl, no) {
	return tpl.replace(/\${client\.iHorizon_Emojis\.No}/g, no);
}

let pass = 0, fail = 0;
function eq(name, a, b) {
	const sa = JSON.stringify(a), sb = JSON.stringify(b);
	if (sa === sb) { pass++; }
	else { fail++; console.log(`FAIL ${name}: got ${sa} want ${sb}`); }
}

// --- normalizeTrack ---
let r = normalizeTrack({ info: { author: "Artist", title: "Song", duration: 200000, isStream: false, uri: "https://youtu.be/x" } });
eq("N1 youtube base", r, { artist: "Artist", durationMs: 200000, title: "Song", url: "https://youtu.be/x" });
eq("N1 album undefined", r.album, undefined);
r = normalizeTrack({ info: { author: "A", title: "T", duration: 180000, isStream: false, uri: "https://open.spotify.com/track/y" }, pluginInfo: { albumName: "Album" } });
eq("N2 album wired", r.album, "Album");
r = normalizeTrack({ info: { author: "A", title: "Live", duration: 999999, isStream: true, uri: "https://youtu.be/z" } });
eq("N3 stream zeroes", r.durationMs, 0);
r = normalizeTrack({ info: { author: "A", title: "T", duration: 1000, isStream: false, uri: null } });
eq("N4 null uri passthrough", r.url, null);
r = normalizeTrack({ info: { author: "A", title: "T", duration: 1000, isStream: false } });
eq("N5 missing uri", r.url, undefined);
r = normalizeTrack({ info: { author: "A", title: "T", duration: 1000, isStream: false, uri: "u" }, pluginInfo: null });
eq("N6 null pluginInfo", r.album, undefined);
r = normalizeTrack({ info: { author: "", title: "", duration: 0, isStream: false, uri: "u" }, pluginInfo: {} });
eq("N7 empty fields verbatim", [r.artist, r.title, r.durationMs], ["", "", 0]);

// --- isConfigured ---
eq("C1 both set", isConfigured("k", "s"), true);
eq("C2 empty key", isConfigured("", "s"), false);
eq("C3 empty secret", isConfigured("k", ""), false);
eq("C4 both empty", isConfigured("", ""), false);
eq("C5 whitespace truthy", isConfigured(" ", " "), true);

// --- getMissingConfigurationMessage ---
eq("M1 single token", getMissingConfigurationMessage(`${NO_TOKEN} | not configured`, "<:No:1>"), "<:No:1> | not configured");
eq("M2 double token global", getMissingConfigurationMessage(`${NO_TOKEN} a ${NO_TOKEN}`, "X"), "X a X");
eq("M3 no token", getMissingConfigurationMessage("plain text", "X"), "plain text");
eq("M4 yes token untouched", getMissingConfigurationMessage("${client.iHorizon_Emojis.Yes} | x", "X"), "${client.iHorizon_Emojis.Yes} | x");

console.log(`slice-90 battery: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
