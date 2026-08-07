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
import { SubCommand } from "../../../../types/command.js";
import { getTTSData } from "../../../core/modules/ttsManager.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const ttsData = await getTTSData(client, interaction.guild.id);
		const isActive = ttsData && ttsData.enabled;

		const embed = new EmbedBuilder()
			.setColor(isActive ? "#57F287" : "#ED4245")
			.setTitle(lang.tts_info_embed_title)
			.setDescription(lang.tts_info_embed_description)
			.addFields({
				name: lang.tts_info_field_status,
				value: isActive ? lang.var_enabled : lang.var_disabled,
				inline: true
			});

		if (isActive) {
			embed.addFields(
				{
					name: lang.var_voice_channel,
					value: `<#${ttsData.voiceChannelId}>`,
					inline: true
				},
				{
					name: lang.var_text_channel,
					value: `<#${ttsData.textChannelId}>`,
					inline: true
				},
				{
					name: lang.tts_info_field_lang,
					value: `\`${ttsData.lang}\``,
					inline: true
				}
			);
		}

		embed.addFields({
			name: lang.tts_info_field_howto,
			value: lang.tts_info_howto_value
		});

		await client.func.method.interactionSend(interaction, {
			embeds: [embed]
		});
	}
};
