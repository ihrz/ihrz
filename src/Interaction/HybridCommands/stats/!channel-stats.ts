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
	AttachmentBuilder,
	ChatInputCommandInteraction,
	ChannelType,
	Client,
	Message,
	TextChannel,
	VoiceChannel
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";
import { SubCommand } from "../../../../types/command.js";
import {
	getChannelName,
	getChannelMessagesCount,
	getChannelMinutesCount
} from "../../../core/functions/userStatsUtils.js";
import {
	fetchAvatar,
	renderStatsPage,
	StatsBlock,
	StatsMetric
} from "../../../core/modules/statsPage.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (!client.user || !interaction.guild || !interaction.channel) return;

		let targetChannel: TextChannel | VoiceChannel | null = null;

		if (interaction instanceof ChatInputCommandInteraction) {
			const channelOption = interaction.options.getChannel("channel");
			targetChannel = (channelOption || interaction.channel) as
				TextChannel | VoiceChannel;
		} else {
			if (args && args.length > 0) {
				const channel = await client.func.method.channel(
					interaction as Message,
					args,
					0
				);
				targetChannel = channel as TextChannel | VoiceChannel;
			} else {
				targetChannel = interaction.channel as
					TextChannel | VoiceChannel;
			}
		}

		if (!targetChannel) {
			return await client.func.method.interactionSend(interaction, {
				content:
					lang.stats_channel_invalid || "Invalid channel specified."
			});
		}

		const msg = await client.func.method.interactionSend(
			interaction,
			client.iHorizon_Emojis.Discord_Loading
		);

		const res = (await client.db.get(
			`${interaction.guildId}.STATS`
		)) as DatabaseStructure.GuildStats | null;

		if (!res || !res.USER) {
			return await client.func.method.interactionSend(interaction, {
				content: lang.stats_no_data
			});
		}

		const nowTimestamp = Date.now();
		const dailyTimeout = 86_400_000;
		const weeklyTimeout = 604_800_000;
		const monthlyTimeout = 2_592_000_000;

		let allMessages: DatabaseStructure.StatsMessage[] = [];
		let allVoiceActivities: DatabaseStructure.StatsVoice[] = [];

		// Get top users for this channel
		const userMessageCounts: { [userId: string]: number } = {};
		const userVoiceDurations: { [userId: string]: number } = {};

		for (const memberId in res.USER) {
			const userData = res.USER[memberId];
			const userMessages =
				userData.messages?.filter(
					(m) => m.channelId === targetChannel.id
				) || [];
			const userVoices =
				userData.voices?.filter(
					(v) => v.channelId === targetChannel.id
				) || [];

			allMessages = [...allMessages, ...userMessages];
			allVoiceActivities = [...allVoiceActivities, ...userVoices];

			// Count messages per user
			userMessageCounts[memberId] = userMessages.length;

			// Count voice duration per user
			userVoiceDurations[memberId] = userVoices.reduce((acc, voice) => {
				return acc + (voice.endTimestamp - voice.startTimestamp);
			}, 0);
		}

		let dailyMessages = 0,
			weeklyMessages = 0,
			monthlyMessages = 0;
		let dailyVoice = 0,
			weeklyVoice = 0,
			monthlyVoice = 0;
		const totalMessages = allMessages.length;
		let totalVoice = 0;

		allMessages.forEach((message) => {
			if (nowTimestamp - message.sentTimestamp <= dailyTimeout)
				dailyMessages++;
			if (nowTimestamp - message.sentTimestamp <= weeklyTimeout)
				weeklyMessages++;
			if (nowTimestamp - message.sentTimestamp <= monthlyTimeout)
				monthlyMessages++;
		});

		allVoiceActivities.forEach((voice) => {
			const duration = voice.endTimestamp - voice.startTimestamp;
			totalVoice += duration;
			if (nowTimestamp - voice.endTimestamp <= dailyTimeout)
				dailyVoice += duration;
			if (nowTimestamp - voice.endTimestamp <= weeklyTimeout)
				weeklyVoice += duration;
			if (nowTimestamp - voice.endTimestamp <= monthlyTimeout)
				monthlyVoice += duration;
		});

		// Count active users (users with at least one message or voice activity)
		const activeUsersSet = new Set<string>();
		for (const memberId in res.USER) {
			const userData = res.USER[memberId];
			const hasMessages = userData.messages?.some(
				(m) => m.channelId === targetChannel.id
			);
			const hasVoices = userData.voices?.some(
				(v) => v.channelId === targetChannel.id
			);
			if (hasMessages || hasVoices) {
				activeUsersSet.add(memberId);
			}
		}
		const activeUsers = activeUsersSet.size;

		const topMessageUsers = Object.entries(userMessageCounts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(async ([userId, count]) => {
				const user = await client.users.fetch(userId).catch(() => null);
				return { user, count };
			});

		const topVoiceUsers = Object.entries(userVoiceDurations)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(async ([userId, duration]) => {
				const user = await client.users.fetch(userId).catch(() => null);
				return { user, duration };
			});

		const topMessageUsersResolved = await Promise.all(topMessageUsers);
		const topVoiceUsersResolved = await Promise.all(topVoiceUsers);

		const isVoiceChannel = targetChannel instanceof VoiceChannel;
		const isTextChannel = targetChannel instanceof TextChannel;

		const currentDate = new Date().toLocaleDateString(
			(await client.db.get(`${interaction.guildId}.LANG.lang`)) ||
				"en-US",
			{
				year: "numeric",
				month: "long",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit"
			}
		);

		const duration = (ms: number) =>
			client.timeCalculator.to_beautiful_string(ms, lang);

		const [guildIcon, messageAvatars, voiceAvatars] = await Promise.all([
			fetchAvatar(
				interaction.guild.iconURL({ size: 256, extension: "png" }) ||
					client.user.displayAvatarURL({
						size: 256,
						extension: "png"
					})
			),
			Promise.all(
				topMessageUsersResolved.map((item) =>
					fetchAvatar(
						item.user?.displayAvatarURL({
							size: 64,
							extension: "png"
						})
					)
				)
			),
			Promise.all(
				topVoiceUsersResolved.map((item) =>
					fetchAvatar(
						item.user?.displayAvatarURL({
							size: 64,
							extension: "png"
						})
					)
				)
			)
		]);

		const blocks: StatsBlock[] = [];
		const overview: StatsMetric[] = [];
		if (isTextChannel) {
			overview.push(
				{
					value: String(dailyMessages),
					label: `${lang.var_1d} ${lang.messages_word}`
				},
				{
					value: String(weeklyMessages),
					label: `${lang.var_7d} ${lang.messages_word}`
				},
				{
					value: String(monthlyMessages),
					label: `${lang.var_14d} ${lang.messages_word}`
				},
				{
					value: String(totalMessages),
					label: `${lang.var_total} ${lang.messages_word}`
				}
			);
		}
		if (isVoiceChannel) {
			overview.push(
				{
					value: duration(dailyVoice),
					label: `${lang.var_1d} ${lang.voice_activity}`
				},
				{
					value: duration(weeklyVoice),
					label: `${lang.var_7d} ${lang.voice_activity}`
				},
				{
					value: duration(monthlyVoice),
					label: `${lang.var_14d} ${lang.voice_activity}`
				},
				{
					value: duration(totalVoice),
					label: `${lang.var_total} ${lang.voice_activity}`
				}
			);
		}
		overview.push({
			value: String(activeUsers),
			label: lang.active_users_title
		});

		blocks.push({
			type: "metrics",
			title: lang.channel_stats_title,
			icon: "📊",
			columns: overview.length > 3 ? 3 : overview.length,
			items: overview
		});
		if (isTextChannel) {
			blocks.push({
				type: "list",
				title: lang.top_messages_title,
				icon: "💬",
				empty: lang.var_none,
				rows: topMessageUsersResolved.map((item, index) => ({
					avatar: messageAvatars[index],
					name: `@${item.user?.username || lang.var_unknown}`,
					detail: `${item.count} ${lang.messages_word}`,
					value: String(item.count),
					unit: lang.messages_word
				}))
			});
		}
		if (isVoiceChannel) {
			blocks.push({
				type: "list",
				title: lang.top_voice_title,
				icon: "🎤",
				accent: "#EB459E",
				empty: lang.var_none,
				rows: topVoiceUsersResolved.map((item, index) => ({
					avatar: voiceAvatars[index],
					name: `@${item.user?.username || lang.var_unknown}`,
					value: duration(item.duration)
				}))
			});
		}

		const image = await renderStatsPage({
			title: lang.channel_stats_title,
			meta: [interaction.guild.name, `#${targetChannel.name}`],
			avatar: guildIcon,
			footer: lang.stats_generated_on.replace("{date}", currentDate),
			blocks
		});

		const attachment = new AttachmentBuilder(image, {
			name: "channel-stats.png"
		});

		msg.edit({ content: null, files: [attachment] });
	}
};
