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
import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import { acquireEconomyLock } from "../../../core/modules/economyLock.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	sendCard
} from "../../../core/modules/uiCard.js";

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

		const releaseLock = acquireEconomyLock(
			interaction.guildId!,
			interaction.member.user.id
		);
		if (!releaseLock) {
			await client.func.method.interactionSend(interaction, {
				content: lang.economy_action_in_progress,
				flags: [1 << 6]
			});
			return;
		}

		try {
			const opts = client.func.method.options(interaction, args);
			const toDeposit = opts.string("how-much", 0) as string;

			if (
				await client.func.moduleToggle.replyIfModuleDisabled(
					client,
					interaction,
					lang,
					"economy"
				)
			)
				return;

			const balance =
				(await client.db.get(
					`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.money`
				)) || 0;

			// Parsed once: the same integer is checked and moved.
			const amount =
				toDeposit === "all"
					? Math.floor(Number(balance))
					: Number(toDeposit);

			if (!Number.isSafeInteger(amount) || amount <= 0) {
				await client.func.method.interactionSend(interaction, {
					content:
						lang.temporary_voice_limit_button_not_integer.replace(
							"${emoji_No}",
							client.iHorizon_Emojis.No
						)
				});
				return;
			}

			if (amount > balance) {
				await client.func.method.interactionSend(interaction, {
					content: lang.deposit_cannot_abuse.replace(
						"${emoji_No}",
						client.iHorizon_Emojis.No
					)
				});
				return;
			}

			await client.db.add(
				`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.bank`,
				amount
			);
			await client.db.sub(
				`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.money`,
				amount
			);

			const e = client.iHorizon_Emojis;
			const newBank = await client.db.get(
				`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.bank`
			);
			await sendCard(
				client,
				interaction,
				buildCard({
					accent: ACCENT.success,
					emoji: e.Wallet,
					title: lang.deposit_embed_title,
					description: lang.deposit_embed_desc
						.replace("${emoji_Coin}", e.Coin)
						.replace(
							"${author}",
							interaction.member.user.toString()
						)
						.replace("${toDeposit}", amount.toString()),
					thumbnail: interaction.member.displayAvatarURL({
						size: 256
					}),
					fields: [
						{
							emoji: e.Coin,
							label: lang.deposit_embed_fields1_name,
							value: `${newBank}${e.Coin}`
						}
					],
					signature: await botSignature(client, interaction.guildId)
				})
			);
			await client.func.economyLogs.deposit(
				interaction.guild,
				interaction.member.user.id,
				amount,
				lang
			);
			return;
		} finally {
			releaseLock();
		}
	}
};
