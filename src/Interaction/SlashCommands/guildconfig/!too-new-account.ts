/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	BaseGuildTextChannel,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import logger from '../../../core/logger.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

		let action = interaction.options.getString('action') as string;
		let maximumDate = interaction.options.getString('maximum-date');


		if (action === 'on') {
			if (!maximumDate) {
				await interaction.editReply({
					content: lang.too_new_account_dont_specified_time_on_enable
				});
				return;
			}

			let calculatedTime = client.timeCalculator.to_ms(maximumDate);
			if (!calculatedTime) {
				await interaction.editReply({
					content: lang.too_new_account_invalid_time_on_enable
				});
				return;
			}

			let beautifulTime = client.timeCalculator.to_beautiful_string(calculatedTime, lang);

			await client.func.ihorizon_logs(interaction, {
				title: lang.too_new_account_logEmbed_title,
				description: lang.too_new_account_logEmbed_desc_on_enable
					.replace('${interaction.user}', interaction.user.toString())
					.replace('${beautifulTime}', beautifulTime.toString())
					.replace('${interaction.guild?.name}', beautifulTime.toString())
			});

			await client.db.set(`${interaction.guildId}.GUILD.BLOCK_NEW_ACCOUNT`, {
				state: true,
				req: calculatedTime
			});

			await interaction.editReply({
				content: lang.too_new_account_logEmbed_desc_on_enable
					.replace('${interaction.user}', interaction.user.toString())
					.replace('${beautifulTime}', beautifulTime.toString())
					.replace('${interaction.guild?.name}', beautifulTime.toString())
			});
			return;

		} else if (action === 'off') {
			await client.func.ihorizon_logs(interaction, {
				title: lang.too_new_account_logEmbed_title,
				description: lang.too_new_account_logEmbed_desc_on_disable
					.replace('${interaction.user}', interaction.user.toString())
			});

			await client.db.delete(`${interaction.guildId}.GUILD.BLOCK_NEW_ACCOUNT`);

			await interaction.editReply({
				content: lang.too_new_account_command_work_on_disable
					.replace('${interaction.user}', interaction.user.toString())
			});
			return;
		}
	},
};