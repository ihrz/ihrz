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
	EmbedBuilder,
	Message
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { processBatchAsync } from '../../../core/functions/batchProcessor.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

		const banned_members = await interaction.guild.bans.fetch()

		const unbanned_members: string[] = [];
		let cannot_unban = 0;

		if (!banned_members || banned_members.size === 0) {
			await client.func.method.interactionSend(interaction, { content: lang.action_unban_all_no_banned_members });
			return;
		}

		// Send immediate response
		const ogInteraction = await client.func.method.interactionSend(interaction, {
			content: lang.batch_derank_process.replace("${banned_members.size}", banned_members.size.toString())
		});

		// Process unbans in batches asynchronously
		processBatchAsync(
			Array.from(banned_members.values()),
			async (banInfo) => {
				try {
					await interaction.guild?.bans.remove(banInfo.user.id);
					unbanned_members.push(banInfo.user.id);
					return true;
				} catch (e) {
					cannot_unban++;
					return false;
				}
			},
			{ batchSize: 5, delay: 200 }, // Slower for unban operations
			async (result) => {
				// Save unbanned members to database
				await client.db.set(`${interaction.guildId}.UTILS.unban_members`, unbanned_members);

				// Send final result
				await client.func.method.interactionSend(interaction, {
					embeds: [
						new EmbedBuilder()
							.setColor(2829617)
							.setDescription(
								lang.action_unban_all_embed_desc
									.replace("${client.iHorizon_Emojis.Yes}", client.iHorizon_Emojis.Yes)
									.replace("${unbanned_members.length}", unbanned_members.length.toString())
									.replace("${client.iHorizon_Emojis.No}", client.iHorizon_Emojis.No)
									.replace('${cannot_unban}', cannot_unban.toString())
							)
							.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!))
							.setTimestamp()
							.setThumbnail(interaction.guild?.iconURL() || '')
					],
					files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
				});
			}
		);

		return;
	},
};
