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

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (interaction instanceof ChatInputCommandInteraction) {
			var number = interaction.options.getNumber("number", false) || 1;
			var faces = interaction.options.getNumber("faces", false) || 6;
		} else {
			var number = client.func.method.number(args!, 0) || 1;
			var faces = client.func.method.number(args!, 1) || 6;
		}

		const results: number[] = [];
		for (let i = 0; i < number; i++) {
			results.push(client.func.random.secureRandomInt(1, faces));
		}

		const total = results.reduce((acc, val) => acc + val, 0);

		await sendCard(
			client,
			interaction,
			buildCard({
				accent: ACCENT.neutral,
				emoji: client.iHorizon_Emojis.Grin,
				title: lang.fun_card_dice_title,
				fields: [
					{
						label: lang.fun_label_dice,
						value: `\`${number} × D${faces}\``
					},
					{
						label: lang.fun_label_rolls,
						value: `\`${results.join(", ")}\``
					},
					{ label: lang.fun_label_total, value: `**${total}**` }
				],
				signature: await botSignature(client, interaction.guildId)
			})
		);
	}
};
