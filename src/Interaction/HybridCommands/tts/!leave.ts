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
import { getTTSData, cleanupTTS } from "../../../core/modules/ttsManager.js";

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

		if (!ttsData || !ttsData.enabled) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tts_leave_not_active.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		const member = interaction.member as GuildMember;
		const voiceChannel = member.voice.channel;

		if (!voiceChannel || voiceChannel.id !== ttsData.voiceChannelId) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tts_leave_not_in_voice.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		await cleanupTTS(client, interaction.guild.id);

		await client.func.method.interactionSend(interaction, {
			content: lang.tts_leave_disabled.replace(
				"${client.iHorizon_Emojis.Yes}",
				client.iHorizon_Emojis.Yes
			)
		});
	}
};
