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

		const unbanned_members = await client.db.get(
			`${interaction.guildId}.UTILS.unban_members`
		);
		const banned_members: string[] = [];
		let cannot_ban = 0;

		if (!unbanned_members || unbanned_members.length === 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.unbanall_undo_command_err
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
				`${e.Discord_Loading} ${lang.unbanall_card_undo_progress.replace(
					"${count}",
					unbanned_members.length.toString()
				)}`
			)
		);

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
				await client.db.set(
					`${interaction.guildId}.UTILS.unban_members`,
					[]
				);

				await sendCard(
					client,
					interaction,
					buildCard({
						accent: ACCENT.danger,
						emoji: e.Ban_Hammer,
						title: lang.unbanall_card_undo_title,
						thumbnail: interaction.guild?.iconURL({ size: 128 }),
						fields: [
							{
								emoji: e.Yes,
								label: lang.unbanall_label_banned,
								value: `\`${banned_members.length}\``
							},
							{
								emoji: e.No,
								label: lang.unbanall_label_failed,
								value: `\`${cannot_ban}\``
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
