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
	Message,
	VoiceChannel
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";
import {
	getTTSData,
	setTTSData,
	sendTTSWelcomeEmbed,
	cleanupTTS
} from "../../../core/modules/ttsManager.js";
import { getH247Data } from "../../../core/modules/h247Manager.js";

import logger from "../../../core/logger.js";

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

		const member = interaction.member as GuildMember;
		const voiceChannel = member.voice.channel;

		if (!voiceChannel) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tts_join_not_in_voice.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		if (!voiceChannel.isTextBased()) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tts_join_not_text_based.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		const existingTTS = await getTTSData(client, interaction.guild.id);
		if (existingTTS && existingTTS.enabled) {
			const existingPlayer = client.player.getPlayer(
				interaction.guild.id
			);
			if (existingPlayer && existingPlayer.connected) {
				await client.func.method.interactionSend(interaction, {
					content: lang.tts_join_already_enabled.replace(
						"${client.iHorizon_Emojis.No}",
						client.iHorizon_Emojis.No
					)
				});
				return;
			}

			await cleanupTTS(client, interaction.guild.id);
		}

		const musicPlayer = client.player.getPlayer(interaction.guild.id);
		if (musicPlayer && musicPlayer.playing) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tts_join_music_playing.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		const h247Data = await getH247Data(client, interaction.guild.id);

		if (
			h247Data?.enabled &&
			voiceChannel.id !== h247Data.voiceChannelId
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.h247_tts_refused.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		const ttsLang = lang.tts_join_lang_fallback || "en-US";

		try {
			const player = client.player.createPlayer({
				guildId: interaction.guild.id,
				voiceChannelId: voiceChannel.id,
				textChannelId: voiceChannel.id,
				selfDeaf: true,
				selfMute: false
			});

			if (!player.connected) {
				await player.connect();
			}

			await client.func.method.changeVoiceChannelStatus(
				voiceChannel.id,
				lang.tts_voice_status
			);

			const embedMessageId = await sendTTSWelcomeEmbed(
				client,
				interaction.guild,
				voiceChannel as VoiceChannel,
				lang
			);

			await setTTSData(client, interaction.guild.id, {
				enabled: true,
				voiceChannelId: voiceChannel.id,
				textChannelId: voiceChannel.id,
				embedMessageId,
				lang: ttsLang
			});

			await client.func.method.interactionSend(interaction, {
				content: lang.tts_join_enabled
					.replace("${voiceChannel}", voiceChannel.toString())
					.replace(
						"${client.iHorizon_Emojis.Yes}",
						client.iHorizon_Emojis.Yes
					)
			});
		} catch (err) {
			logger.err(
				`TTS join error in guild ${interaction.guild.id}: ${err}`
			);
			await client.func.method.interactionSend(interaction, {
				content: lang.tts_join_error.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
		}
	}
};
