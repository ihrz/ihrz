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

import { ChatInputCommandInteraction, Client, Message } from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	sendCard
} from "../../../core/modules/uiCard.js";

/** `▰▰▰▱▱▱▱▱▱▱`, ten steps. */
function meter(value: number, max: number): string {
	const filled = Math.max(0, Math.min(10, Math.round((value / max) * 10)));
	return `\`${"▰".repeat(filled)}${"▱".repeat(10 - filled)}\``;
}

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Nombre entre 0 et 100
		const random = client.func.random.secureRandomInt(0, 99);

		// Fetch user ou soit même
		const user =
			(interaction instanceof ChatInputCommandInteraction
				? interaction.options.getUser("user")
				: client.func.method.member(interaction, args!, 0)) ||
			interaction.member!;

		await sendCard(
			client,
			interaction,
			buildCard({
				accent: ACCENT.neutral,
				emoji: client.iHorizon_Emojis.Rainbow_Tada,
				title: lang.fun_card_gay_title,
				fields: [
					{ label: lang.utils_label_member, value: user.toString() },
					{
						label: lang.fun_label_score,
						value: `${meter(random, 100)} **${random}%**`
					}
				],
				signature: await botSignature(client, interaction.guildId)
			})
		);
	}
};
