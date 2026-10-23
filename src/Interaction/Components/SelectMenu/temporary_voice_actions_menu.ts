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

import { ButtonInteraction, StringSelectMenuInteraction } from "discord.js";

/**
 * String select menu of the temporary voice channel panel (inside the voice
 * channel itself). Each option value is the matching button customId, so the
 * whole permission + flow logic stays in the existing button handlers.
 */
export default async function (
	interaction: StringSelectMenuInteraction<"cached">
) {
	const value = interaction.values[0];

	if (!value?.startsWith("temporary_voice_")) return;

	const handler = interaction.client.buttons.get(value) as
		((button: ButtonInteraction<"cached">) => Promise<any>) | undefined;

	if (!handler) return await interaction.deferUpdate();

	await handler(interaction as unknown as ButtonInteraction<"cached">).catch(
		() => null
	);
}
