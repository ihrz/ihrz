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

import { ChatInputCommandInteraction, Client } from "discord.js";
import { LanguageData } from "../../../../../types/languageData.js";

import { SubCommand } from "../../../../../types/command.js";
import { DatabaseStructure } from "../../../../../types/database_structure.js";
import {
	canManageSuggestions,
	suggestionOutcomeText,
	updateSuggestion
} from "../../../../core/modules/suggestionManager.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached">,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!interaction.member ||
			!client.user ||
			!interaction.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const id = interaction.options.getString("id", true).replace(/^#/, "");
		const reason = interaction.options.getString("reason", true);
		const baseData = (await client.db.get(
			`${interaction.guildId}.SUGGEST`
		)) as DatabaseStructure.SuggestSchema | null;

		if (!canManageSuggestions(interaction.member, baseData)) {
			await interaction.editReply({ content: lang.suggest_not_staff });
			return;
		}

		if (
			!baseData ||
			baseData.channel !== interaction.channel.id ||
			baseData.disable === true
		) {
			await interaction.editReply({
				content: lang.suggest_deny_not_good_channel.replace(
					"${channel}",
					baseData?.channel ?? ""
				)
			});
			return;
		}

		const result = await updateSuggestion(
			client,
			interaction.guild,
			id,
			{ status: "denied", reason, moderator: interaction.user },
			lang
		);

		await interaction.editReply({
			content: suggestionOutcomeText(
				lang,
				interaction.guildId,
				interaction.channel.id,
				"deny",
				result
			)
		});
	}
};
