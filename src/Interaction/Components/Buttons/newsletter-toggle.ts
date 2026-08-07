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

import { ButtonInteraction } from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import { metasTable } from "../../../Events/client/ready.js";

export default async function (
	interaction: ButtonInteraction,
	lang: LanguageData
) {
	const ownerId = interaction.user.id;

	const bl = (await metasTable.get("newsletter_bl")) as Record<
		string,
		boolean
	> | null;
	const isDisabled = bl?.[ownerId] === true;

	const updated: Record<string, boolean> = { ...bl };
	if (isDisabled) {
		delete updated[ownerId];
	} else {
		updated[ownerId] = true;
	}
	await metasTable.set("newsletter_bl", updated);

	await interaction.reply({
		content: isDisabled
			? lang.newsletter_toggle_enabled
			: lang.newsletter_toggle_disabled,
		flags: [1 << 6]
	});
}
