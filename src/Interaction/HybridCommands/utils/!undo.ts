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

		const unbanned_members = await client.db.get(`${interaction.guildId}.UTILS.unban_members`);
		const banned_members: string[] = [];
		let cannot_ban = 0;

		if (!unbanned_members || unbanned_members.length === 0) {
			await client.func.method.interactionSend(interaction, {
				content: "No members to re-ban. Use the unban all command first."
			});
			return;
		}

		// Send immediate response
		const ogInteraction = await client.func.method.interactionSend(interaction, {
			content: lang.batch_undo_unban.replace("${unbanned_members.length}", unbanned_members.length.toString())
		});

		// Process bans in batches asynchronously
		processBatchAsync(
			unbanned_members,
			async (userId: string) => {
				try {
					await interaction.guild?.bans.create(userId);
					banned_members.push(userId);
					return true;
				} catch (e) {
					cannot_ban++;
					return false;
				}
			},
			{ batchSize: 5, delay: 200 },
			async (result) => {
				// Clear the unban list and send final result
				await client.db.set(`${interaction.guildId}.UTILS.unban_members`, []);

				await client.func.method.interactionSend(interaction, {
					embeds: [
						new EmbedBuilder()
							.setColor(2829617)
							.setDescription(
								lang.action_unban_undo_embed_desc
									.replace("${client.iHorizon_Emojis.Yes}", client.iHorizon_Emojis.Yes)
									.replace("${banned_members.length}", banned_members.length.toString())
									.replace("${client.iHorizon_Emojis.No}", client.iHorizon_Emojis.No)
									.replace('${cannot_ban}', cannot_ban.toString())
							)
							.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!))
							.setTimestamp()
							.setThumbnail(interaction.guild!.iconURL())
					],
					files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
				});
			}
		);

		return;
	},
};