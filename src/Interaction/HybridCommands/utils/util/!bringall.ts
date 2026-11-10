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
	Message,
	CategoryChannel
} from "discord.js";

import { LanguageData } from "../../../../../types/languageData.js";
import { SubCommand } from "../../../../../types/command.js";
import {
	categoryVoiceChannels,
	moveMembers
} from "../../../../core/modules/memberToolsManager.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	notice,
	sendCard
} from "../../../../core/modules/uiCard.js";

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

		const opts = client.func.method.options(interaction, args);
		const fromChannel = await opts.voiceChannel("from", 0);

		if (interaction instanceof ChatInputCommandInteraction) {
			var category = interaction.options.getChannel(
				"category"
			) as CategoryChannel | null;
		} else {
			var categoryId = client.func.method.string(args!, 1);
			var category = categoryId
				? (interaction.guild.channels.cache.get(
						categoryId
					) as CategoryChannel | null)
				: null;
		}

		// Validate inputs
		if (!fromChannel) {
			return await client.func.method.interactionSend(interaction, {
				content: lang.bringall_no_from_channel
			});
		}

		if (!category || category.type !== ChannelType.GuildCategory) {
			return await client.func.method.interactionSend(interaction, {
				content: lang.bringall_invalid_category
			});
		}

		// Get all voice channels in the target category
		const targetVoiceChannels = categoryVoiceChannels(category);

		if (targetVoiceChannels.length === 0) {
			return await client.func.method.interactionSend(interaction, {
				content: lang.bringall_no_voice_channels
			});
		}

		const membersToMove = Array.from(fromChannel.members.values());

		if (membersToMove.length === 0) {
			return await client.func.method.interactionSend(interaction, {
				content: lang.bringall_no_members
			});
		}

		await sendCard(
			client,
			interaction,
			notice("info", client.iHorizon_Emojis.Discord_Loading)
		);

		// Shuffle members randomly
		const shuffledMembers = membersToMove.sort(
			() => client.func.random.secureRandomFloat() - 0.5
		);

		// Distribute members across voice channels
		const { moved: movedCount, failed: errorCount } = await moveMembers(
			shuffledMembers,
			(i) => targetVoiceChannels[i % targetVoiceChannels.length]
		);

		const emojis = client.iHorizon_Emojis;
		await sendCard(
			client,
			interaction,
			buildCard({
				accent: errorCount > 0 ? ACCENT.warning : ACCENT.success,
				emoji: emojis.Voice_Channel,
				title: lang.bringall_card_title,
				thumbnail: interaction.guild.iconURL(),
				fields: [
					{
						emoji: emojis.Voice_Channel,
						label: lang.utils_label_from,
						value: fromChannel.toString()
					},
					{
						emoji: emojis.Ticket_Category,
						label: lang.bringall_label_category,
						value: category.toString()
					},
					{
						emoji: emojis.VC_Transfer,
						label: lang.bringall_label_channels,
						value: `\`${targetVoiceChannels.length}\``
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
