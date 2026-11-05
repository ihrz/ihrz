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
	Client,
	ChatInputCommandInteraction,
	ChannelType,
	BaseGuildVoiceChannel,
	VoiceChannel,
	Message
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	notice,
	sendCard
} from "../../../core/modules/uiCard.js";

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

		const allChannel =
			Array.from(interaction.guild.channels.cache.values()!).filter(
				(x) =>
					x.type ===
					(ChannelType.GuildVoice || ChannelType.GuildStageVoice)
			) || [];

		if (interaction instanceof ChatInputCommandInteraction) {
			var fromChannel = interaction.options.getChannel(
				"from"
			) as BaseGuildVoiceChannel | null;
			var toChannel = interaction.options.getChannel(
				"channel"
			)! as BaseGuildVoiceChannel | null;
		} else {
			var fromChannel = await client.func.method.voiceChannel(
				interaction,
				args!,
				0
			);
			var toChannel = await client.func.method.voiceChannel(
				interaction,
				args!,
				1
			);
		}

		if (toChannel === null) return;

		let movedCount = 0;
		let errorCount = 0;

		await sendCard(
			client,
			interaction,
			notice("info", client.iHorizon_Emojis.Discord_Loading)
		);

		if (fromChannel) {
			for (const member of (
				fromChannel as BaseGuildVoiceChannel
			).members.values()) {
				try {
					await member.voice.setChannel(toChannel as VoiceChannel);
					movedCount++;
				} catch (error) {
					errorCount++;
				}
			}
		} else if (allChannel) {
			for (const channel of allChannel) {
				for (const member of (
					channel as BaseGuildVoiceChannel
				).members.values()) {
					try {
						await member.voice.setChannel(
							toChannel as VoiceChannel
						);
						movedCount++;
					} catch (error) {
						errorCount++;
					}
				}
			}
		}

		const emojis = client.iHorizon_Emojis;
		await sendCard(
			client,
			interaction,
			buildCard({
				accent: errorCount > 0 ? ACCENT.warning : ACCENT.success,
				emoji: emojis.Voice_Channel,
				title: lang.massmove_card_title,
				thumbnail: interaction.guild.iconURL(),
				fields: [
					{
						emoji: emojis.Voice_Channel,
						label: lang.utils_label_from,
						value:
							fromChannel?.toString() ||
							allChannel.map((x) => x.toString()).join(", ")
					},
					{
						emoji: emojis.VC_Transfer,
						label: lang.utils_label_to,
						value: toChannel.toString()
					},
					{
						emoji: emojis.Yes,
						label: lang.utils_label_moved,
						value: `\`${movedCount}\``
					},
					{
						emoji: emojis.No,
						label: lang.utils_label_failed,
						value: `\`${errorCount}\``
					},
					{
						emoji: emojis.Crown,
						label: lang.utils_label_by,
						value: interaction.member.toString()
					}
				],
				signature: await botSignature(client, interaction.guildId)
			})
		);
	}
};
