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

import { Client, ChatInputCommandInteraction, Message } from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

import { DatabaseStructure } from "../../../../types/database_structure.js";
import { SubCommand } from "../../../../types/command.js";
import promptYesOrNo from "../../../core/functions/awaitingResponse.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	sendCard
} from "../../../core/modules/uiCard.js";
import { sendWarnsClearedLog } from "../../../core/modules/warnSystem.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData
	) => {
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const DbData = (await client.db.get(
			`${interaction.guild?.id}.USER`
		)) as DatabaseStructure.DbGuildUserObject | null;

		const response = await promptYesOrNo(interaction, {
			content: lang.clear_allwarns_confirmation_message,
			noButton: lang.resetallinvites_no_button,
			yesButton: lang.resetallinvites_yes_button,
			dangerAction: true
		});

		if (response) {
			let count = 0;
			let members = 0;
			for (const entries in DbData) {
				const warns = DbData?.[entries]?.WARNS;
				if (Array.isArray(warns) && warns.length > 0) {
					count += warns.length;
					members++;
				}
				await client.db.delete(
					`${interaction.guild?.id}.USER.${entries}.WARNS`
				);
			}

			const e = client.iHorizon_Emojis;
			await sendCard(
				client,
				interaction,
				buildCard({
					accent: ACCENT.success,
					emoji: e.Yes,
					title: lang.clear_allwarns_card_title,
					description: lang.clear_allwarns_command_ok,
					fields: [
						{
							emoji: e.Security,
							label: lang.mod_label_moderator,
							value: interaction.member.toString()
						}
					],
					signature: await botSignature(client, interaction.guildId)
				})
			);
			if (count > 0)
				await sendWarnsClearedLog(
					interaction.guild,
					interaction.member.toString(),
					{ count, members },
					lang
				);
		} else {
			await client.func.method.interactionSend(interaction, {
				content: lang.setjoinroles_action_canceled,
				components: []
			});
		}
		return;
	}
};
