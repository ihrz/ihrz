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
import { notice, sendCard } from "../../../core/modules/uiCard.js";
import { editMemberInvites } from "../../../core/modules/memberToolsManager.js";

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

		const opts = client.func.method.options(interaction, args);
		if (interaction instanceof ChatInputCommandInteraction) {
			var user = interaction.options.getMember("member") as GuildMember;
		} else {
			var user =
				client.func.method.member(interaction, args!, 0) ||
				interaction.member;
		}
		const amount = opts.number("amount", 1)!;

		const total = await editMemberInvites(
			client,
			interaction.guild.id,
			user.id,
			"remove",
			amount
		);

		await sendCard(
			client,
			interaction,
			notice(
				"success",
				`${client.iHorizon_Emojis.Yes} ${lang.removeinvites_confirmation_embed_description
					.replaceAll("${amount}", amount.toString())
					.replaceAll(
						"${user}",
						user.toString()
					)}\n-# ${lang.invites_label_total} : \`${total}\``
			)
		);

		await client.func.ihorizon_logs(interaction, {
			title: lang.removeinvites_logs_embed_title,
			description: lang.removeinvites_logs_embed_description
				.replaceAll("${authorId}", interaction.member.user.id)
				.replaceAll("${amount}", amount.toString())
				.replaceAll("${userId}", user.id)
		});
	}
};
