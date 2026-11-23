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
	ChatInputCommandInteraction,
	Client,
	GuildMember,
	Message
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	sendCard
} from "../../../core/modules/uiCard.js";
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
		const user = opts.member("member", 0) as GuildMember;

		const bal = await editMemberMoney(
			client,
			interaction.guild.id,
			user.id,
			"remove",
			amount
		);

		const e = client.iHorizon_Emojis;
		const card = buildCard({
			accent: ACCENT.danger,
			emoji: e.Wallet,
			title: lang.removemoney_embed_title,
			thumbnail: user.displayAvatarURL({ size: 256 }),
			description: user.toString(),
			fields: [
				{
					emoji: e.Minus,
					label: lang.removemoney_embed_fields,
					value: `${amount}${e.Coin}`
				},
				{
					emoji: e.Coin,
					label: lang.removemoney_embed_second_fields,
					value: `${bal}${e.Coin}`
				}
			],
			signature: await botSignature(client, interaction.guild.id)
		});

		await client.func.ihorizon_logs(interaction, {
			title: lang.removemoney_logs_embed_title,
			description: lang.removemoney_logs_embed_description
				.replaceAll("${authorId}", interaction.member.user.id)
				.replaceAll("${amount}", amount.toString())
				.replaceAll("${userId}", user.id)
		});

		await sendCard(client, interaction, card);

		client.func.economyLogs.removeMoney(
			interaction.guild,
			interaction.member.user.id,
			user?.id!,
			amount,
			lang
		);

		return;
	}
};
