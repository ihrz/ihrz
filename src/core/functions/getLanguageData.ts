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

import { LanguageData } from "../../../types/languageData.js";
import getLanguageDataByCode from "./getLanguageDataByCode.js";
import { getCachedGuildValue } from "../modules/guildConfigCache.js";

export interface LangsData {
	[lang: string]: LanguageData;
}

export const LangsData: LangsData = {};

// Each language in its own name (the /setlang menu, the welcome card).
export const AvailableLanguage: { code: string; name: string; flag: string }[] =
	[
		{ name: "العربية المصرية", code: "ar-EG", flag: "🇪🇬" },
		{ name: "Deutsch", code: "de-DE", flag: "🇩🇪" },
		{ name: "English", code: "en-US", flag: "🇺🇸" },
		{ name: "Español", code: "es-ES", flag: "🇪🇸" },
		{ name: "Français", code: "fr-FR", flag: "🇫🇷" },
		{ name: "Français vulgaire", code: "fr-ME", flag: "🇫🇷" },
		{ name: "Italiano", code: "it-IT", flag: "🇮🇹" },
		{ name: "日本語", code: "jp-JP", flag: "🇯🇵" },
		{ name: "한국어", code: "ko-KR", flag: "🇰🇷" },
		{ name: "Polski", code: "pl-PL", flag: "🇵🇱" },
		{ name: "Português", code: "pt-PT", flag: "🇵🇹" },
		{ name: "Русский", code: "ru-RU", flag: "🇷🇺" },
		{ name: "Українська", code: "uk-UA", flag: "🇺🇦" }
	];

// A Discord locale ("uk", "fr", "es-ES", "ja", "pt-BR"…) as the bot's language code; English otherwise.
const LOCALE_PREFIX: Record<string, string> = {
	ar: "ar-EG",
	de: "de-DE",
	en: "en-US",
	es: "es-ES",
	fr: "fr-FR",
	it: "it-IT",
	ja: "jp-JP",
	ko: "ko-KR",
	pl: "pl-PL",
	pt: "pt-PT",
	ru: "ru-RU",
	uk: "uk-UA"
};
export function languageForLocale(locale: string | null | undefined): string {
	return (
		LOCALE_PREFIX[(locale ?? "").split("-")[0]?.toLowerCase() ?? ""] ??
		"en-US"
	);
}

export default async function getLanguageData(
	arg: string | undefined | null
): Promise<LanguageData> {
	// Read on nearly every message by several modules: served from cache.
	let lang = arg
		? await getCachedGuildValue<string>(`${arg}.GUILD.LANG.lang`)
		: null;

	if (!lang) {
		lang = "en-US";
	}

	return getLanguageDataByCode(lang);
}
