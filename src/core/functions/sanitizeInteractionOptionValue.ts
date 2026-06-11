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

const SENSITIVE_OPTION_NAMES = new Set([
	"password",
	"pass",
	"token",
	"apitoken",
	"apikey",
	"secret",
	"sharedsecret",
	"credential",
	"sessionkey",
	"sessiontoken"
]);

export function sanitizeInteractionOptionValue(
	optionName: string,
	optionValue: unknown
): string {
	const normalizedName = optionName.toLowerCase().replace(/[^a-z0-9]/g, "");

	if (SENSITIVE_OPTION_NAMES.has(normalizedName)) {
		return "[REDACTED]";
	}

	return String(optionValue);
}
