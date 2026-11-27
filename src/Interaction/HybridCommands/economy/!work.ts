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

import { ChatInputCommandInteraction, Client, Message, User } from "discord.js";

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
		lang: LanguageData
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
			const timeout =
				(await client.db.get(
					`${interaction.guildId}.ECONOMY.settings.work.cooldown`
				)) ?? 3_600_000;
			const work = await client.db.get(
				`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.work`
			);

			if (
				await client.func.moduleToggle.replyIfModuleDisabled(
					client,
					interaction,
					lang,
					"economy"
				)
			)
				return;

			if (work !== null && timeout - (Date.now() - work) > 0) {
				const time = client.timeCalculator.to_beautiful_string(
					timeout - (Date.now() - work),
					lang
				);

				await client.func.method.interactionSend(interaction, {
					content: lang.economy_cooldown_error.replace(
						"${time}",
						time
					),
					flags: [1 << 6]
				});
				return;
			}

			const amount =
				client.func.random.secureRandomInt(1, 1024) *
				(await client.func.economyHelper.getMemberBoost(
					interaction.member
				));

			const name =
				(interaction.member.user as User).globalName ||
				interaction.member.user.username;
			const card = buildCard({
				accent: ACCENT.success,
				emoji: client.iHorizon_Emojis.Coin,
				title: lang.work_embed_author.replaceAll(
					"${authorUsername}",
					name
				),
				description: lang.work_embed_description
					.replaceAll("${authorUsername}", name)
					.replaceAll("${amount}", amount.toString()),
				thumbnail: interaction.member.displayAvatarURL({ size: 256 }),
				signature: await botSignature(client, interaction.guildId)
			});

			await client.db.set(
				`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.work`,
				Date.now()
			);
			await client.db.add(
				`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.money`,
				amount
			);

			await sendCard(client, interaction, card);
		} finally {
			releaseLock();
		}
	}
};
