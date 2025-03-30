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
	CategoryChannel,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Message,
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';
import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var category = interaction.options.getChannel("category") as CategoryChannel | null;
		} else {
			var category = await client.func.method.channel(interaction, args!, 0) as CategoryChannel | null;
		};

		let child_channels = category?.children.cache.values()!;

		let changes: string[] | string = [];

		for (let child of child_channels) {
			if (!child.permissionsLocked) {
				await child.lockPermissions();
				changes.push(child.id);
			}
		}

		changes = changes.map(x => `• <#${x}>`).join('\n');

		// Create an embed message
		const embed = new EmbedBuilder()
			.setColor('#5865F2') // Discord's blurple color
			.setDescription(
				changes.length > 0
					? lang.util_sync_embed_description_1
						.replace("${category?.name}", String(category?.name))
						.replace("${changes}", changes)
					: lang.util_sync_embed_description_0)
			.setFooter(await client.func.displayBotName.footerBuilder(interaction))
			.setTimestamp();

		client.func.method.interactionSend(interaction, {
			embeds: [embed],
			files: [await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction)]
		});
	},
};