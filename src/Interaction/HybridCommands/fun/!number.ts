/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	ChatInputCommandInteraction,
	Client,
	Message,
	EmbedBuilder
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (interaction instanceof ChatInputCommandInteraction) {
			var min = interaction.options.getNumber("min", false) || 0;
			var max = interaction.options.getNumber("max", false) || 100;
		} else {
			var min = client.func.method.number(args!, 0) || 0;
			var max = client.func.method.number(args!, 1) || 100;
		}

		// security
		if (min > max) [min, max] = [max, min];

		const random = Math.floor(Math.random() * (max - min + 1)) + min;

		const embed = new EmbedBuilder()
			.setTitle(lang.fun_random_embed_title)
			.setDescription(`${lang.fun_random_result_text} **${random}**\n(${lang.fun_random_between} ${min} ↔ ${max})`)
			.setColor("Random");

		await client.func.method.interactionSend(interaction, { embeds: [embed] });
	}
};
