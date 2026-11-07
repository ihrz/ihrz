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

import {
	Client,
	ChatInputCommandInteraction,
	User,
	Message,
	GuildMember
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import { acquireEconomyLock } from "./economyLock.js";

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
		if (!releaseLock) return;

		try {
			if (interaction instanceof ChatInputCommandInteraction) {
				var amount = interaction.options.getNumber("amount") as number;
				var user = interaction.options.getMember(
					"member"
				) as GuildMember;
			} else {
				var amount = client.func.method.number(args!, 0) as number;
				var user = client.func.method.member(
					interaction,
					args!,
					0
				) as GuildMember;
			}

			const member = await client.db.get(
				`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.money`
			);

			if (
				(await client.db.get(
					`${interaction.guildId}.ECONOMY.disabled`
				)) === true
			) {
				await client.func.method.interactionSend(interaction, {
					content: lang.economy_disable_msg.replace(
						"${authorId}",
						interaction.member.user.id
					)
				});
				return;
			}

			if (amount.toString().includes("-")) {
				await client.func.method.interactionSend(interaction, {
					content: lang.pay_negative_number_error
				});
				return;
			}

			if (amount && (member ?? 0) < amount) {
				await client.func.method.interactionSend(interaction, {
					content: lang.pay_dont_have_enought_to_give
				});
				return;
			}

			await client.db.add(
				`${interaction.guildId}.USER.${user.id}.ECONOMY.money`,
				amount!
			);
			await client.db.sub(
				`${interaction.guildId}.USER.${interaction.member.user.id}.ECONOMY.money`,
				amount!
			);
			await client.func.method.interactionSend(interaction, {
				content: lang.pay_command_work
					.replaceAll(
						"${authorUsername}",
						(interaction.member.user as User).globalName ||
							interaction.member.user.username
					)
					.replaceAll(
						"${userUsername}",
						user.user.globalName || user.user.displayName
					)
					.replaceAll("${amount}", amount.toString())
			});

			await client.func.economyLogs.pay(
				interaction.guild,
				interaction.member.user.id,
				user.id,
				amount,
				lang
			);
			return;
		} finally {
			releaseLock();
		}
	}
};
