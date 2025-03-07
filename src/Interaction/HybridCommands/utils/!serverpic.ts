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
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Message,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		let embed = new EmbedBuilder()
			.setImage(interaction.guild.iconURL({ extension: "webp", size: 4096 }))
			.setColor("#add5ff")
			.setTitle(interaction.guild.name);

		await client.func.method.interactionSend(interaction, {
			embeds: [embed],
			components: [
				new ActionRowBuilder<ButtonBuilder>()
					.addComponents(
						new ButtonBuilder()
							.setStyle(ButtonStyle.Link)
							.setLabel(lang.pfps_download_guild_button)
							.setURL(interaction.guild.iconURL({ extension: "webp", size: 4096 }) || "https://ihorizon.org/assets/img/unknown-user.png")
					)
			]
		});
		return;
	},
};