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

import { ChatInputCommandInteraction, Client, Message } from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";
import { getTTSData, setTTSData } from "../../../core/modules/ttsManager.js";

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

		const languageChoice =
			interaction instanceof ChatInputCommandInteraction
				? interaction.options.getString("language")!
				: args?.[0] || "en-US";

		const ttsData = await getTTSData(client, interaction.guild.id);

		if (!ttsData || !ttsData.enabled) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tts_lang_not_active.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		ttsData.lang = languageChoice;
		await setTTSData(client, interaction.guild.id, ttsData);

		await client.func.method.interactionSend(interaction, {
			content: lang.tts_lang_set
				.replace("${language}", languageChoice)
				.replace(
					"${client.iHorizon_Emojis.Yes}",
					client.iHorizon_Emojis.Yes
				)
		});
	}
};
