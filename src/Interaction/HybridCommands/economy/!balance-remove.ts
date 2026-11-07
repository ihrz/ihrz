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
	EmbedBuilder,
	GuildMember,
	Message,
	User
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";

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
		const amount = opts.number("amount", 0) as number;
		const user = opts.member("member", 0) as GuildMember;

		await client.db.sub(
			`${interaction.guildId}.USER.${user.id}.ECONOMY.money`,
			amount!
		);
		const bal = await client.db.get(
			`${interaction.guildId}.USER.${user.id}.ECONOMY.money`
		);

		const embed = new EmbedBuilder()
			.setAuthor({
				name: lang.removemoney_embed_title,
				iconURL: (interaction.member.user as User).displayAvatarURL()
			})
			.addFields(
				{ name: lang.removemoney_embed_fields, value: `${amount}$` },
				{ name: lang.removemoney_embed_second_fields, value: `${bal}$` }
			)
			.setColor("#bc0116")
			.setTimestamp();

		await client.func.ihorizon_logs(interaction, {
			title: lang.removemoney_logs_embed_title,
			description: lang.removemoney_logs_embed_description
				.replaceAll("${authorId}", interaction.member.user.id)
				.replaceAll("${amount}", amount.toString())
				.replaceAll("${userId}", user.id)
		});

		await client.func.method.interactionSend(interaction, {
			embeds: [embed]
		});

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
