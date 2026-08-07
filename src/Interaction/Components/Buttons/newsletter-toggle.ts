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

export default async function (
	interaction: ButtonInteraction,
	lang: LanguageData
) {
	const ownerId = interaction.user.id;

	const rawParts = interaction.customId.split("%");
	const dataPart = rawParts[1]?.split("?")[0] ?? null;

	const isDisabled = !!(await interaction.client.db.get(
		`newsletter_disabled_${ownerId}`
	));

	if (isDisabled) {
		await interaction.client.db.delete(`newsletter_disabled_${ownerId}`);
	} else {
		await interaction.client.db.set(`newsletter_disabled_${ownerId}`, true);
	}

	await interaction.reply({
		content: isDisabled
			? lang.newsletter_toggle_enabled
			: lang.newsletter_toggle_disabled,
		flags: [1 << 6]
	});
}
