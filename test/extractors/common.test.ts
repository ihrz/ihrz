/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

import { expect, test } from "bun:test";

import {
	clockToSeconds,
	decodeHtmlEntities,
	extractScriptTags,
	isoDurationToSeconds,
	stripHtmlTags
} from "../../src/core/extractors/common/parse.js";
import {
	formatSpotifyEmbedUrl,
	formatSpotifyOpenUrl,
	parseSpotifyLink
} from "../../src/core/extractors/spotify/uri.js";

// ---- common/parse ----

test("parse: isoDurationToSeconds", () => {
	expect(isoDurationToSeconds("PT3M17S")).toBe(197);
	expect(isoDurationToSeconds("PT1H2M3S")).toBe(3723);
	expect(isoDurationToSeconds("PT0S")).toBe(0);
	expect(isoDurationToSeconds("")).toBe(0);
});

test("parse: clockToSeconds", () => {
	expect(clockToSeconds("3:17")).toBe(197);
	expect(clockToSeconds("1:03:17")).toBe(3797);
	expect(clockToSeconds(undefined)).toBe(0);
	expect(clockToSeconds(null)).toBe(0);
	expect(clockToSeconds("garbage")).toBe(0);
});

test("parse: decodeHtmlEntities", () => {
	expect(
		decodeHtmlEntities("Don&#x27;t &amp; &lt;go&gt; &quot;now&quot;")
	).toBe('Don\'t & <go> "now"');
});

test("parse: stripHtmlTags", () => {
	expect(stripHtmlTags('<a href="#">Artist</a>')).toBe("Artist");
});

test("parse: extractScriptTags", () => {
	const tags = extractScriptTags(
		`<html><head><script id="__NEXT_DATA__" type="application/json">{"a":1}</script></head>
		 <body><script id="resource">base64==</script></body></html>`
	);

	expect(tags.length).toBe(2);
	expect(tags[0].attributes["id"]).toBe("__NEXT_DATA__");
	expect(tags[0].content).toBe('{"a":1}');
	expect(tags[1].attributes["id"]).toBe("resource");
	expect(tags[1].content).toBe("base64==");
});

// ---- spotify/uri ----

test("spotify uri: parse open.spotify.com links", () => {
	expect(
		parseSpotifyLink(
			"https://open.spotify.com/track/5nTtCOCds6I0PHMNtqelas"
		)
	).toEqual({ type: "track", id: "5nTtCOCds6I0PHMNtqelas" });

	expect(
		parseSpotifyLink(
			"https://open.spotify.com/embed/album/4tDBsfbHRJ9OdcMO9bmnai"
		)
	).toEqual({ type: "album", id: "4tDBsfbHRJ9OdcMO9bmnai" });

	expect(
		parseSpotifyLink(
			"https://open.spotify.com/intl-de/playlist/3Q4cPwMHY95ZHXtmcU2xvH?si=abc"
		)
	).toEqual({ type: "playlist", id: "3Q4cPwMHY95ZHXtmcU2xvH" });
});

test("spotify uri: parse spotify: URIs", () => {
	expect(parseSpotifyLink("spotify:track:5nTtCOCds6I0PHMNtqelas")).toEqual({
		type: "track",
		id: "5nTtCOCds6I0PHMNtqelas"
	});

	expect(parseSpotifyLink("spotify:playlist:3Q4cPwMHY95ZHXtmcU2xvH")).toEqual(
		{
			type: "playlist",
			id: "3Q4cPwMHY95ZHXtmcU2xvH"
		}
	);
});

test("spotify uri: reject non spotify input", () => {
	expect(parseSpotifyLink("")).toBeUndefined();
	expect(
		parseSpotifyLink("http://google.com/5a2w2tgpLwv26BYJf2qYwu")
	).toBeUndefined();
});

test("spotify uri: format urls", () => {
	expect(
		formatSpotifyOpenUrl(
			"https://open.spotify.com/embed/track/5nTtCOCds6I0PHMNtqelas"
		)
	).toBe("https://open.spotify.com/track/5nTtCOCds6I0PHMNtqelas");

	expect(formatSpotifyEmbedUrl("spotify:track:5nTtCOCds6I0PHMNtqelas")).toBe(
		"https://open.spotify.com/embed/track/5nTtCOCds6I0PHMNtqelas"
	);
});
