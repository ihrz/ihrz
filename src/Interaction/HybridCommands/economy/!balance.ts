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
import { DatabaseStructure } from "../../../../types/database_structure.js";
import { SubCommand } from "../../../../types/command.js";
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

		if (
			(await client.db.get(`${interaction.guildId}.ECONOMY.disabled`)) ===
			true
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.economy_disable_msg.replace(
					"${authorId}",
					interaction.member.user.id
				)
			});
			return;
		}

		const opts = client.func.method.options(interaction, args);
		const member: GuildMember =
			opts.member("user", 0) || interaction.member;

		const baseData: DatabaseStructure.EconomyUserSchema =
			(await client.db.get(
				`${interaction.guildId}.USER.${member.id}.ECONOMY`
			)) || { money: 0, bank: 0, ownedRoles: [] };

		const possibleBoost = await client.func.economyHelper.getMemberBoost(
			interaction.member!
		);
		const totalWallet = (baseData.money || 0) + (baseData.bank || 0);

		const e = client.iHorizon_Emojis;
		await sendCard(
			client,
			interaction,
			buildCard({
				accent: ACCENT.neutral,
				emoji: e.Wallet,
				title: lang.economy_balance_wallet_title.replace(
					"${user}",
					member.user.username
				),
				description: lang.balance_he_have_wallet
					.replace("${bal}", totalWallet.toString())
					.replace("${user}", member.toString())
					.replace("${emoji_Wallet}", e.Wallet),
				thumbnail: member.displayAvatarURL({ size: 256 }),
				fields: [
					{
						emoji: e.Coin,
						label: lang.balance_embed_fields1_name,
						value: `${baseData.bank || 0}${e.Coin}`
					},
					{
						emoji: e.Wallet,
						label: lang.balance_embed_fields2_name,
						value: `${baseData.money || 0}${e.Coin}`
					},
					{
						emoji: e.Boost_Gem,
						label: lang.var_boost,
						value: `${possibleBoost}x`
					}
				],
				signature: await botSignature(client, interaction.guildId)
			})
		);
		return;
	}
};
