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
	PermissionsBitField
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

		let id = interaction.options.getString("id");

		let baseData = await client.db.get(`${interaction.guildId}.SUGGEST`);
		let fetchId = await client.db.get(`${interaction.guildId}.SUGGESTION.${id}`);

		if (!baseData
			|| baseData?.channel !== interaction.channel?.id
			|| baseData?.disable === true) {
			await interaction.deleteReply();
			await interaction.followUp({
				content: lang.suggest_delete_not_good_channel
					.replace('${baseData?.channel}', baseData?.channel),
				flags: [1 << 6]
			});

			return;
		};

		if (!fetchId) {
			await interaction.deleteReply();
			await interaction.followUp({ content: lang.suggest_delete_not_found_db, flags: [1 << 6] });
			return;
		};

		let channel = interaction.guild.channels.cache.get(baseData?.channel);

		await (channel as BaseGuildTextChannel).messages.fetch(fetchId?.msgId).then(async (msg) => {
			msg.delete();
			await client.db.delete(`${interaction.guildId}.SUGGESTION.${id}`);

			await interaction.deleteReply();
			await interaction.followUp({ content: lang.suggest_delete_command_work, flags: [1 << 6] });
			return;
		}).catch(async () => {
			await interaction.deleteReply();
			await interaction.followUp({ content: lang.suggest_delete_command_error, flags: [1 << 6] });
			return;
		});
	},
};