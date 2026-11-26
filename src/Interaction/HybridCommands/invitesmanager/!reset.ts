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
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	ComponentType,
	Message
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";

import { resetGuildInvites } from "../../../core/modules/memberToolsManager.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	cardPayload,
	notice,
	sendCard
} from "../../../core/modules/uiCard.js";

import { SubCommand } from "../../../../types/command.js";

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

		const e = client.iHorizon_Emojis;
		// Same prompt as promptYesOrNo (same buttons, no timeout), as a card:
		// the answer replaces it, and a Components V2 message stays V2.
		const prompt = buildCard({
			accent: ACCENT.danger,
			emoji: e.Warning_Icon,
			title: lang.invites_reset_title,
			description: lang.resetallinvites_warning_msg,
			signature: await botSignature(client, interaction.guildId)
		}).addActionRowComponents(
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId("yes")
					.setStyle(ButtonStyle.Danger)
					.setLabel(lang.resetallinvites_yes_button),
				new ButtonBuilder()
					.setCustomId("blank1")
					.setStyle(ButtonStyle.Secondary)
					.setLabel("<   >")
					.setDisabled(true),
				new ButtonBuilder()
					.setCustomId("no")
					.setStyle(ButtonStyle.Success)
					.setLabel(lang.resetallinvites_no_button)
			)
		);

		const sent = await sendCard(client, interaction, prompt);
		const choice = await sent.awaitMessageComponent({
			componentType: ComponentType.Button,
			filter: (x) => x.user.id === interaction.member?.user.id
		});

		await choice.deferUpdate();

		if (choice.customId === "yes") {
			await resetGuildInvites(client, interaction.guild.id);
			await choice.editReply(
				cardPayload(
					notice(
						"success",
						`${e.Yes} ${lang.resetallinvites_succes_on_delete}`
					)
				)
			);

			await client.func.ihorizon_logs(interaction, {
				title: lang.resetallinvites_logs_embed_title,
				description: lang.resetallinvites_logs_embed_desc.replace(
					"${author}",
					interaction.member.user.toString()
				)
			});
		} else {
			await choice.editReply(
				cardPayload(
					notice(
						"info",
						`${e.No} ${lang.setjoinroles_action_canceled}`
					)
				)
			);
		}
	}
};
