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
	BaseGuildVoiceChannel,
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	Message
} from "discord.js";

import logger from "../../../core/logger.js";
import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";
import {
	getH247Data,
	setH247Data,
	joinH247VoiceChannel
} from "../../../core/modules/h247Manager.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const channel = interaction instanceof ChatInputCommandInteraction
			? (interaction.options.getChannel("channel") as BaseGuildVoiceChannel | null)
			: await client.func.method.voiceChannel(interaction, args!, 0);

		if (!channel || channel.type !== ChannelType.GuildVoice) {
			await client.func.method.interactionSend(interaction, {
				content: lang.h247_join_invalid_channel.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		const existing = await getH247Data(client, interaction.guild.id);

		if (existing?.enabled && existing.voiceChannelId === channel.id) {
			await client.func.method.interactionSend(interaction, {
				content: lang.h247_join_already_active
					.replace("${voiceChannel}", channel.toString())
					.replace(
						"${client.iHorizon_Emojis.No}",
						client.iHorizon_Emojis.No
					)
			});
			return;
		}

		const player = client.player.getPlayer(interaction.guild.id);

		if (player?.playing) {
			await client.func.method.interactionSend(interaction, {
				content: lang.h247_join_music_playing.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		try {
			if (player) {
				await player.destroy().catch(() => {});
			}

			const joined = await joinH247VoiceChannel(
				interaction.guild,
				channel.id
			);

			if (!joined) {
				await client.func.method.interactionSend(interaction, {
					content: lang.h247_join_error.replace(
						"${client.iHorizon_Emojis.No}",
						client.iHorizon_Emojis.No
					)
				});
				return;
			}

			await setH247Data(client, interaction.guild.id, {
				enabled: true,
				voiceChannelId: channel.id
			});

			await client.func.method.interactionSend(interaction, {
				content: lang.h247_joined
					.replace("${voiceChannel}", channel.toString())
					.replace(
						"${client.iHorizon_Emojis.Yes}",
						client.iHorizon_Emojis.Yes
					)
			});
		} catch (error) {
			logger.err(
				`H247 join error in guild ${interaction.guild.id}: ${error}`
			);
			await client.func.method.interactionSend(interaction, {
				content: lang.h247_join_error.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
		}
	}
};
