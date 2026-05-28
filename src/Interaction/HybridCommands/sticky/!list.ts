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
	Message
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";
import { SubCommand } from "../../../../types/command.js";

function resolveListLine(
	lang: LanguageData,
	config: DatabaseStructure.StickyChannelConfig
): string {
	const channel = `<#${config.channelId}>`;

	if (config.content && config.embedId) {
		return lang.sticky_list_embed_desc_line_text_embed
			.replace("${channel}", channel)
			.replace("${embed_id}", config.embedId);
	}

	if (config.embedId) {
		return lang.sticky_list_embed_desc_line_embed
			.replace("${channel}", channel)
			.replace("${embed_id}", config.embedId);
	}

	return lang.sticky_list_embed_desc_line_text.replace("${channel}", channel);
}

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData
	) => {
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const stickyData = (await client.db.get(
			`${interaction.guildId}.STICKY`
		)) as DatabaseStructure.StickySchema | undefined;
		const stickyChannels = Object.values(stickyData || {})
			.filter((config) => config?.enabled)
			.sort((a, b) => a.channelId.localeCompare(b.channelId));

		const embed = new EmbedBuilder()
			.setColor("#11304c")
			.setTitle(lang.sticky_list_embed_title)
			.setFooter(
				await client.func.displayBotName.footerBuilder(
					interaction.guildId!
				)
			);

		if (stickyChannels.length === 0) {
			embed.setDescription(lang.sticky_list_embed_desc_empty);
		} else {
			embed.setDescription(
				stickyChannels
					.map((config) => resolveListLine(lang, config))
					.join("\n")
			);
		}

		await client.func.method.interactionSend(interaction, {
			embeds: [embed],
			files: [
				await client.func.displayBotName.footerAttachmentBuilder(
					interaction
				)
			]
		});
	}
};
