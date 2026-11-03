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

/*
 * Emoji for resvg, which cannot draw color fonts: each emoji grapheme is
 * drawn as its Twemoji SVG (the set Discord uses), fetched once from a
 * pinned CDN version and kept in memory. A failed fetch renders nothing
 * for that emoji instead of failing the image.
 */

const TWEMOJI_BASE =
	"https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg";
const FETCH_TIMEOUT_MS = 3_000;
const CACHE_MAX = 2_000;
const FAILURE_RETRY_MS = 60_000;

const ZWJ = "‍";
const VS16 = /️/g;
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

// Twemoji code -> data URI (null: unavailable, retried after a while).
const cache = new Map<string, { value: Promise<string | null>; at: number }>();

export interface Grapheme {
	value: string;
	emoji: boolean;
}

// ©, ®, ™, ... are pictographic but stay text unless followed by VS16.
function isEmoji(segment: string): boolean {
	if (!EMOJI.test(segment)) return false;
	const first = segment.codePointAt(0)!;
	return first >= 0x2190 || segment.includes("️");
}

export function graphemes(text: string): Grapheme[] {
	return [...segmenter.segment(text)].map(({ segment }) => ({
		value: segment,
		emoji: isEmoji(segment)
	}));
}

/** Twemoji file name: code points in hex, VS16 dropped outside ZWJ sequences. */
export function twemojiCode(emoji: string): string {
	const normalized = emoji.includes(ZWJ) ? emoji : emoji.replace(VS16, "");
	return [...normalized]
		.map((char) => char.codePointAt(0)!.toString(16))
		.join("-");
}

async function fetchTwemoji(code: string): Promise<string | null> {
	const response = await fetch(`${TWEMOJI_BASE}/${code}.svg`, {
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
	}).catch(() => null);
	if (!response?.ok) return null;
	const svg = await response.text().catch(() => null);
	if (!svg?.startsWith("<svg")) return null;
	return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** Data URI of the emoji's Twemoji image, or null when unavailable. */
export function emojiImage(emoji: string): Promise<string | null> {
	const code = twemojiCode(emoji);
	const cached = cache.get(code);
	if (cached) {
		const failedLongAgo = Date.now() - cached.at > FAILURE_RETRY_MS;
		if (!failedLongAgo) return cached.value;
		return cached.value.then((value) =>
			value !== null ? value : refresh(code)
		);
	}
	return refresh(code);
}

function refresh(code: string): Promise<string | null> {
	if (cache.size >= CACHE_MAX) {
		const oldest = cache.keys().next().value;
		if (oldest) cache.delete(oldest);
	}
	const value = fetchTwemoji(code);
	cache.set(code, { value, at: Date.now() });
	return value;
}
