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
import { LanguageData } from "../../../../../types/languageData.js";
import { processBatchAsync } from "../../../../core/functions/batchProcessor.js";

import { SubCommand } from "../../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	notice,
	sendCard
} from "../../../../core/modules/uiCard.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!interaction.member ||
			!client.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const banned_members = await interaction.guild.bans.fetch();

		const unbanned_members: string[] = [];
		let cannot_unban = 0;

		if (!banned_members || banned_members.size === 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.action_unban_all_no_banned_members
			});
			return;
		}

		const e = client.iHorizon_Emojis;

		// Send immediate response (a card, so the final result can replace it)
		await sendCard(
			client,
			interaction,
			notice(
				"info",
				`${e.Discord_Loading} ${lang.unbanall_card_progress.replace(
					"${count}",
					banned_members.size.toString()
				)}`
			)
		);

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
				await client.db.set(
					`${interaction.guildId}.UTILS.unban_members`,
					unbanned_members
				);

				// Send final result
				await sendCard(
					client,
					interaction,
					buildCard({
						accent:
							cannot_unban > 0 ? ACCENT.warning : ACCENT.success,
						emoji: e.Unlock,
						title: lang.unbanall_card_title,
						thumbnail:
							interaction.guild?.iconURL({ size: 128 }) ||
							client.user?.displayAvatarURL({ size: 128 }),
						fields: [
							{
								emoji: e.Yes,
								label: lang.unbanall_label_unbanned,
								value: `\`${unbanned_members.length}\``
							},
							{
								emoji: e.No,
								label: lang.unbanall_label_failed,
								value: `\`${cannot_unban}\``
							}
						],
						signature: await botSignature(
							client,
							interaction.guildId
						)
					})
				);
			}
		);

		return;
	}
};
