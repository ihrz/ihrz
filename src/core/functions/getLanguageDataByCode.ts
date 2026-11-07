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

import { LanguageData } from "../../../types/languageData";
import { AvailableLanguage, LangsData } from "./getLanguageData.ts";

// Built on first use: getLanguageData.ts imports this module too.
let langCodes: Set<string> | null = null;

const EMOJI_MARKER = "${emoji_";

/**
 * Replaces every `${emoji_<Name>}` with the bot's emoji, so no call site has
 * to (or can forget to) replace emojis. Unknown names are left as written.
 */
function resolveEmojis(value: string, emojis: Record<string, string>): string {
	let start = value.indexOf(EMOJI_MARKER);
	if (start === -1) return value;

	let out = "";
	let from = 0;
	while (start !== -1) {
		const end = value.indexOf("}", start);
		if (end === -1) break;
		const name = value.slice(start + EMOJI_MARKER.length, end);
		out +=
			value.slice(from, start) +
			(emojis[name] ?? value.slice(start, end + 1));
		from = end + 1;
		start = value.indexOf(EMOJI_MARKER, from);
	}
	return out + value.slice(from);
}

function withEmojis(
	lang: LanguageData,
	emojis: Record<string, string>
): LanguageData {
	const resolved: Record<string, string | string[]> = {};
	for (const [key, value] of Object.entries(lang)) {
		resolved[key] = Array.isArray(value)
			? value.map((line) => resolveEmojis(line, emojis))
			: resolveEmojis(value, emojis);
	}
	return resolved as LanguageData;
}

export default async function getLanguageDataByCode(
	locale: string
): Promise<LanguageData> {
	// The locale comes from guild / user settings: only known codes may
	// reach the dynamic import.
	langCodes ??= new Set(AvailableLanguage.map((language) => language.code));
	const code = langCodes.has(locale) ? locale : "en-US";

	const cached = LangsData[code];
	if (cached) return cached;

	const { default: langFiles } = await import("../../exports/lang.ts");
	const raw = (await langFiles[`${code}.ts`]()).default as LanguageData;
	const emojis = globalThis.client?.iHorizon_Emojis as
		Record<string, string> | undefined;
	// Before the emoji sync (ready event) there is nothing to resolve yet:
	// serve the raw strings and cache only the resolved version.
	if (!emojis) return raw;

	const lang = withEmojis(raw, emojis);
	LangsData[code] = lang;
	return lang;
}
