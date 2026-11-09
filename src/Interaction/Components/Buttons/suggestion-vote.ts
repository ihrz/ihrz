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

import { ButtonInteraction } from "discord.js";

import { DatabaseStructure } from "../../../../types/database_structure.js";
import { LanguageData } from "../../../../types/languageData.js";
import {
	isSuggestionClosed,
	suggestionComponents
} from "../../../core/modules/suggestionManager.js";

export default async function (
	interaction: ButtonInteraction<"cached">,
	lang: LanguageData
) {
	const [, choice, code] = interaction.customId.split("%") as [
		string,
		"up" | "down",
		string
	];
	const path = `${interaction.guildId}.SUGGESTION.${code}`;
	const data = (await interaction.client.db.get(
		path
	)) as DatabaseStructure.Suggestion | null;

	if (!data || isSuggestionClosed(data)) {
		await interaction.deferUpdate().catch(() => {});
		return;
	}

	// clicking the current vote again removes it
	if (data.votes?.[interaction.user.id] === choice) {
		await interaction.client.db.delete(
			`${path}.votes.${interaction.user.id}`
		);
	} else {
		await interaction.client.db.set(
			`${path}.votes.${interaction.user.id}`,
			choice
		);
	}

	const votes = ((await interaction.client.db.get(`${path}.votes`)) ??
		{}) as NonNullable<DatabaseStructure.Suggestion["votes"]>;

	await interaction.update({
		components: suggestionComponents(lang, code, { ...data, votes })
	});
}
