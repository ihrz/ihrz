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

import { SubCommand } from "../../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	notice,
	sendCard
} from "../../../../core/modules/uiCard.js";
import { unbanAll } from "../../../../core/modules/moderationOps.js";

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

		const e = client.iHorizon_Emojis;
		const guild = interaction.guild;

		const result = await unbanAll(guild, {
			onStart: (total) =>
				sendCard(
					client,
					interaction,
					notice(
						"info",
						`${e.Discord_Loading} ${lang.unbanall_card_progress.replace(
							"${count}",
							total.toString()
						)}`
					)
				),
			onDone: async (r) => {
				await sendCard(
					client,
					interaction,
					buildCard({
						accent: r.failed > 0 ? ACCENT.warning : ACCENT.success,
						emoji: e.Unlock,
						title: lang.unbanall_card_title,
						thumbnail:
							guild.iconURL({ size: 128 }) ||
							client.user?.displayAvatarURL({ size: 128 }),
						fields: [
							{
								emoji: e.Yes,
								label: lang.unbanall_label_unbanned,
								value: `\`${r.unbanned}\``
							},
							{
								emoji: e.No,
								label: lang.unbanall_label_failed,
								value: `\`${r.failed}\``
							}
						],
						signature: await botSignature(
							client,
							interaction.guildId
						)
					})
				);
			}
		});

		if (!result.ok) {
			await client.func.method.interactionSend(interaction, {
				content:
					result.code === "busy"
						? lang.action_mass_job_running
						: lang.action_unban_all_no_banned_members
			});
			return;
		}

		return;
	}
};
