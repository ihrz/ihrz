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
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';
import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		let role;
		let limit_count: number;

		if (interaction instanceof ChatInputCommandInteraction) {
			role = interaction.options.getRole("role", false);
			limit_count = interaction.options.getNumber("members-limit", false) || 0;
		} else {
			role = client.func.method.role(interaction, args!, 0);
			limit_count = client.func.method.number(args!, 1) || 0;
		}

		if (!role || !limit_count) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_rolelimit_bad_opt.replace("${client.iHorizon_Emojis.No}", client.iHorizon_Emojis.No)
			});
			return;
		}

		await client.db.set(`${interaction.guildId}.GUILD.UTILS.ROLE_LIMIT.${role.id}`, limit_count);

		await client.func.method.interactionSend(interaction, {
			content: lang.util_rolelimit_good
				.replaceAll("${client.iHorizon_Emojis.Crown}", client.iHorizon_Emojis.Crown)
				.replaceAll("${role.toString()}", role.toString())
				.replaceAll("${limit_count}", String(limit_count))
		});

		return;
	},
};