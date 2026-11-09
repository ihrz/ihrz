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

import { ButtonInteraction, TextInputStyle } from "discord.js";

import { DatabaseStructure } from "../../../../types/database_structure.js";
import { LanguageData } from "../../../../types/languageData.js";
import { iHorizonModalResolve } from "../../../core/functions/modalHelper.js";
import {
	canManageSuggestions,
	suggestionOutcomeText,
	updateSuggestion
} from "../../../core/modules/suggestionManager.js";

const STATUS_BY_ACTION = { accept: "accepted", deny: "denied" } as const;

export default async function (
	interaction: ButtonInteraction<"cached">,
	lang: LanguageData
) {
	const [, action, code] = interaction.customId.split("%") as [
		string,
		"accept" | "deny" | "reply",
		string
	];
	const config = (await interaction.client.db.get(
		`${interaction.guildId}.SUGGEST`
	)) as DatabaseStructure.SuggestSchema | null;

	if (!canManageSuggestions(interaction.member, config)) {
		await interaction.reply({
			content: lang.suggest_not_staff,
			flags: [1 << 6]
		});
		return;
	}

	const submit = await iHorizonModalResolve(
		{
			customId: "selection_modal",
			title: lang.suggest_modal_title,
			deferUpdate: true,
			fields: [
				{
					customId: "reason",
					label: lang.suggest_modal_label,
					style: TextInputStyle.Paragraph,
					required: true,
					maxLength: 1000,
					minLength: 1
				}
			]
		},
		interaction
	);
	if (!submit) return;

	const result = await updateSuggestion(
		interaction.client,
		interaction.guild,
		code,
		{
			status: action === "reply" ? undefined : STATUS_BY_ACTION[action],
			reason: submit.fields.getTextInputValue("reason"),
			moderator: interaction.user
		},
		lang
	);

	await submit
		.followUp({
			content: suggestionOutcomeText(
				lang,
				interaction.guildId,
				interaction.channelId,
				action,
				result
			),
			flags: [1 << 6]
		})
		.catch(() => {});
}
