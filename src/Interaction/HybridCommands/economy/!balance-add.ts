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
import {
	editMemberMoney,
	isEconomyDisabled
} from "../../../core/modules/memberToolsManager.js";

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

		if (await isEconomyDisabled(client, interaction.guild.id)) {
			await client.func.method.interactionSend(interaction, {
				content: lang.economy_disable_msg.replace(
					"${authorId}",
					interaction.member.user.id
				)
			});
			return;
		}

		const opts = client.func.method.options(interaction, args);
		const amount = opts.number("amount", 0) as number;
		const user = await opts.user("member", 1);

		await client.func.method.interactionSend(interaction, {
			content: lang.addmoney_command_work
				.replace("${userId}", user?.id!)
				.replace("${amountValue}", amount.toString())
		});

		await editMemberMoney(
			client,
			interaction.guild.id,
			user?.id!,
			"add",
			amount
		);

		await client.func.ihorizon_logs(interaction, {
			title: lang.addmoney_logs_embed_title,
			description: lang.addmoney_logs_embed_description
				.replaceAll("${authorId}", interaction.member.user.id)
				.replaceAll("${amountValue}", amount.toString())
				.replaceAll("${userId}", user?.id!)
		});

		client.func.economyLogs.addMoney(
			interaction.guild,
			interaction.member.user.id,
			user?.id!,
			amount,
			lang
		);
	}
};
