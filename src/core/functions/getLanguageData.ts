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

interface LangsData {
	[lang: string]: LanguageData;
}

const LangsData: LangsData = {};

export const AvailableLanguage: { code: string; name: string; flag: string }[] =
	[
		{
			name: "Arab Egyptian",
			code: "ar-EG",
			flag: "🇪🇬"
		},
		{
			name: "Deutsch",
			code: "de-DE",
			flag: "🇩🇪"
		},
		{
			name: "English",
			code: "en-US",
			flag: "🇺🇸"
		},

		{
			name: "French",
			code: "fr-FR",
			flag: "🇫🇷"
		},
		{
			name: "Italian",
			code: "it-IT",
			flag: "🇮🇹"
		},
		{
			name: "Japanese",
			code: "jp-JP",
			flag: "🇯🇵"
		},
		{
			name: "Portuguese",
			code: "pt-PT",
			flag: "🇵🇹"
		},
		{
			name: "Rude French",
			code: "fr-ME",
			flag: "🇫🇷"
		},
		{
			name: "Russian",
			code: "ru-RU",
			flag: "🇷🇺"
		},
		{
			name: "Spanish",
			code: "es-ES",
			flag: "🇪🇸"
		}
	];

export default async function getLanguageData(
	arg: string | undefined | null
): Promise<LanguageData> {
	let lang = (await client.db.get(`${arg}.GUILD.LANG.lang`)) as string;

	if (!lang) {
		lang = "en-US";
	}

	let dat = LangsData[lang];

	if (!dat) {
		dat = (await import(
			process.cwd() + "/src/lang/" + lang + ".yml"
		)) as LanguageData;
		LangsData[lang] = dat;
	}

	return dat;
}
