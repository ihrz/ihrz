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

import maskLink from "../../../core/functions/maskLink.js";

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
		// Nombre entre 0 et 10
		const random = client.func.random.secureRandomInt(0, 9);

		const string =
			interaction instanceof ChatInputCommandInteraction
				? interaction.options.getString("the_things")
				: client.func.method.longString(args!, 0);

		const the_things = maskLink(string || "nothing");

		await sendCard(
			client,
			interaction,
			buildCard({
				accent: ACCENT.neutral,
				emoji: client.iHorizon_Emojis.Thinking,
				title: lang.fun_card_rate_title,
				fields: [
					{ label: lang.fun_label_rated, value: `**${the_things}**` },
					{
						label: lang.fun_label_score,
						value: `${meter(random, 10)} **${random}/10**`
					}
				],
				signature: await botSignature(client, interaction.guildId)
			})
		);
	}
};
