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

export default async function getLanguageDataByCode(
	locale: string
): Promise<LanguageData> {
	// The locale comes from guild / user settings: only known codes may
	// reach the dynamic import.
	langCodes ??= new Set(AvailableLanguage.map((language) => language.code));
	const code = langCodes.has(locale) ? locale : "en-US";
	let dat = LangsData[code];

	if (!dat) {
		dat = (await import(`../../lang/${code}.ts`)).default as LanguageData;
		LangsData[code] = dat;
	}

	return dat;
}
