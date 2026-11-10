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

import { ChatInputCommandInteraction, Client, EmbedBuilder } from "discord.js";
import { LanguageData } from "../../../../../types/languageData.js";

import { SubCommand } from "../../../../../types/command.js";
import { DatabaseStructure } from "../../../../../types/database_structure.js";
import {
	statusLabel,
	suggestionRows
} from "../../../../core/modules/suggestionManager.js";

const MAX_LISTED = 15;

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached">,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.guild) return;

		const filter = interaction.options.getString(
			"status"
		) as DatabaseStructure.SuggestionStatus | null;
		const channelId = await client.db.get(
			`${interaction.guildId}.SUGGEST.channel`
		);
		const all = ((await client.db.get(
			`${interaction.guildId}.SUGGESTION`
		)) ?? {}) as DatabaseStructure.SuggestionData;

		const rows = suggestionRows(all, filter);

		if (rows.length === 0) {
			await interaction.editReply({ content: lang.suggest_list_empty });
			return;
		}

		const lines = rows
			.slice(0, MAX_LISTED)
			.map(
				({ code, data, up, down }) =>
					`[#${code}](https://discord.com/channels/${interaction.guildId}/${channelId}/${data.msgId}) · **${statusLabel(lang, data.status ?? "pending")}** · +${up} / -${down} · <@${data.author}>`
			);

		const embed = new EmbedBuilder()
			.setColor("#4000ff")
			.setTitle(lang.suggest_list_title)
			.setDescription(lines.join("\n"))
			.setFooter({
				text: lang.suggest_list_footer
					.replace("${shownCount}", lines.length.toString())
					.replace("${totalCount}", rows.length.toString())
			});

		await interaction.editReply({ embeds: [embed] });
	}
};
