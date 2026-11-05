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
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	GuildMember,
	Message,
	User
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";
import {
	channelViews,
	sendStatsCard,
	statsContext
} from "../../../core/modules/statsCommand.js";
import { notice, sendCard } from "../../../core/modules/uiCard.js";

// /stats channel-stats [channel]: one text or voice channel (overview, rhythm).
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

		const picked =
			interaction instanceof ChatInputCommandInteraction
				? interaction.options.getChannel("channel")
				: args?.length
					? await client.func.method.channel(interaction, args, 0)
					: null;
		const channel = picked ?? interaction.channel;
		const allowed = [
			ChannelType.GuildText,
			ChannelType.GuildAnnouncement,
			ChannelType.GuildVoice,
			ChannelType.GuildStageVoice,
			ChannelType.PublicThread,
			ChannelType.PrivateThread
		];
		if (
			!channel ||
			!("type" in channel) ||
			!allowed.includes(channel.type)
		) {
			await sendCard(
				client,
				interaction,
				notice(
					"danger",
					`${client.iHorizon_Emojis.No} ${lang.stats_wrong_channel}`
				)
			);
			return;
		}

		const ctx = await statsContext(client, interaction, lang);
		const views = await channelViews(ctx, channel.id);
		if (!views) {
			await sendCard(
				client,
				interaction,
				notice(
					"info",
					`${client.iHorizon_Emojis.Ticket_Hash} ${lang.stats_card_no_data}`
				)
			);
			return;
		}
		await sendStatsCard(ctx, {
			title: lang.stats_title_channel.replace(
				"${channel}",
				`#${"name" in channel ? channel.name : channel.id}`
			),
			emoji:
				channel.type === ChannelType.GuildVoice ||
				channel.type === ChannelType.GuildStageVoice
					? client.iHorizon_Emojis.Voice_Channel
					: client.iHorizon_Emojis.Ticket_Hash,
			views
		});
	}
};
