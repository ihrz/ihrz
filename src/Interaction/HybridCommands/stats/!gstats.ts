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
	Client,
	Message,
	User
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";
import {
	getChannelMessagesCount,
	getChannelMinutesCount,
	getChannelName,
	getStatsLeaderboard
} from "../../../core/functions/userStatsUtils.js";

type MemberStats = {
	dailyMessages: number;
	weeklyMessages: number;
	monthlyMessages: number;
	dailyVoice: number;
	weeklyVoice: number;
	monthlyVoice: number;
};

type ChannelStats = {
	dailyMessages: number;
	weeklyMessages: number;
	monthlyMessages: number;
	dailyVoice: number;
	weeklyVoice: number;
	monthlyVoice: number;
};

import { SubCommand } from "../../../../types/command.js";
import {
	fetchAvatar,
	renderStatsPage
} from "../../../core/modules/statsPage.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (!client.user || !interaction.guild || !interaction.channel) return;

		let leaderboardData: {
			member: User | undefined;
			dailyMessages: number;
			weeklyMessages: number;
			monthlyMessages: number;
			dailyVoiceActivity: number;
			weeklyVoiceActivity: number;
			monthlyVoiceActivity: number;
		}[] = [];

		const nowTimestamp = Date.now();
		const dailyTimeout = 86_400_000;
		const weeklyTimeout = 604_800_000;
		const monthlyTimeout = 2_592_000_000;

		const res = (await client.db.get(
			`${interaction.guildId}.STATS`
		)) as DatabaseStructure.GuildStats | null;

		const msg = await client.func.method.interactionSend(
			interaction,
			client.iHorizon_Emojis.Discord_Loading
		);

		const memberStats: { [memberId: string]: MemberStats } = {};
		const channelStats: { [channelId: string]: ChannelStats } = {};

		let allMessages: DatabaseStructure.StatsMessage[] = [];
		let allVoiceActivities: DatabaseStructure.StatsVoice[] = [];

		for (const memberId in res?.USER) {
			const userData = res.USER[memberId];
			let dailyMessages = 0,
				weeklyMessages = 0,
				monthlyMessages = 0;
			let dailyVoice = 0,
				weeklyVoice = 0,
				monthlyVoice = 0;

			allMessages = [...allMessages, ...(userData.messages || [])];
			allVoiceActivities = [
				...allVoiceActivities,
				...(userData.voices || [])
			];

			const user = client.users.cache.get(memberId);

			userData.messages?.forEach((message) => {
				if (nowTimestamp - message.sentTimestamp <= dailyTimeout) {
					dailyMessages++;
				}
				if (nowTimestamp - message.sentTimestamp <= weeklyTimeout) {
					weeklyMessages++;
				}
				if (nowTimestamp - message.sentTimestamp <= monthlyTimeout) {
					monthlyMessages++;
				}

				if (!channelStats[message.channelId]) {
					channelStats[message.channelId] = {
						dailyMessages: 0,
						weeklyMessages: 0,
						monthlyMessages: 0,
						dailyVoice: 0,
						weeklyVoice: 0,
						monthlyVoice: 0
					};
				}

				channelStats[message.channelId].dailyMessages +=
					nowTimestamp - message.sentTimestamp <= dailyTimeout
						? 1
						: 0;
				channelStats[message.channelId].weeklyMessages +=
					nowTimestamp - message.sentTimestamp <= weeklyTimeout
						? 1
						: 0;
				channelStats[message.channelId].monthlyMessages +=
					nowTimestamp - message.sentTimestamp <= monthlyTimeout
						? 1
						: 0;
			});

			userData.voices?.forEach((voice) => {
				const voiceDuration = voice.endTimestamp - voice.startTimestamp;
				if (nowTimestamp - voice.endTimestamp <= dailyTimeout) {
					dailyVoice += voiceDuration;
				}
				if (nowTimestamp - voice.endTimestamp <= weeklyTimeout) {
					weeklyVoice += voiceDuration;
				}
				if (nowTimestamp - voice.endTimestamp <= monthlyTimeout) {
					monthlyVoice += voiceDuration;
				}

				if (!channelStats[voice.channelId]) {
					channelStats[voice.channelId] = {
						dailyMessages: 0,
						weeklyMessages: 0,
						monthlyMessages: 0,
						dailyVoice: 0,
						weeklyVoice: 0,
						monthlyVoice: 0
					};
				}

				channelStats[voice.channelId].dailyVoice +=
					nowTimestamp - voice.endTimestamp <= dailyTimeout
						? voiceDuration
						: 0;
				channelStats[voice.channelId].weeklyVoice +=
					nowTimestamp - voice.endTimestamp <= weeklyTimeout
						? voiceDuration
						: 0;
				channelStats[voice.channelId].monthlyVoice +=
					nowTimestamp - voice.endTimestamp <= monthlyTimeout
						? voiceDuration
						: 0;
			});

			leaderboardData.push({
				member: user,
				dailyMessages: dailyMessages,
				weeklyMessages: weeklyMessages,
				monthlyMessages: monthlyMessages,
				dailyVoiceActivity: dailyVoice,
				weeklyVoiceActivity: weeklyVoice,
				monthlyVoiceActivity: monthlyVoice
			});

			memberStats[memberId] = {
				dailyMessages,
				weeklyMessages,
				monthlyMessages,
				dailyVoice,
				weeklyVoice,
				monthlyVoice
			};
		}

		function topThree(
			obj: { [key: string]: { [statKey: string]: number } },
			key: string
		) {
			return Object.entries(obj)
				.sort(([, a], [, b]) => (b[key] as number) - (a[key] as number))
				.slice(0, 3)
				.map(([id, stats]) => ({ id, ...(stats as object) }));
		}

		const [firstActiveChannel, secondActiveChannel, thirdActiveChannel] =
			topThree(channelStats, "dailyMessages").map((item) => item.id);
		const [
			firstActiveVoiceChannel,
			secondActiveVoiceChannel,
			thirdActiveVoiceChannel
		] = topThree(channelStats, "dailyVoice").map((item) => item.id);

		leaderboardData = getStatsLeaderboard(leaderboardData);

		// Format current date for footer
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

		const guild = interaction.guild;
		const channelRow = (channelId: string, icon: string) => ({
			icon,
			name: String(getChannelName(guild, channelId)),
			detail: `${lang.var_category}: ${guild.channels.cache.get(channelId)?.parent?.name || lang.var_none}`
		});

		const [guildIcon, avatars] = await Promise.all([
			fetchAvatar(
				guild.iconURL({ size: 256, extension: "png" }) ||
					client.user.displayAvatarURL({
						size: 256,
						extension: "png"
					})
			),
			Promise.all(
				leaderboardData.map((user) =>
					fetchAvatar(
						user.member?.displayAvatarURL({
							size: 64,
							extension: "png"
						})
					)
				)
			)
		]);

		const image = await renderStatsPage({
			title: lang.header_h1_value.replace(
				"{author_username}",
				guild.name
			),
			meta: [
				`${guild.memberCount} ${lang.var_members}`,
				lang.activity_overview
			],
			avatar: guildIcon,
			footer: lang.stats_generated_on.replace("{date}", currentDate),
			blocks: [
				{
					type: "list",
					title: lang.top_active_users_title,
					icon: "👑",
					empty: lang.stats_no_data,
					rows: leaderboardData.map((user, index) => ({
						avatar: avatars[index],
						name: `@${user.member?.username || lang.var_unknown}`,
						detail: `${lang.var_total}: ${user.monthlyMessages} ${lang.messages_word}, ${(user.monthlyVoiceActivity / 1000 / 60).toFixed(0)} ${lang.minutes_word}`,
						value: String(user.dailyMessages),
						unit: lang.messages_word
					}))
				},
				{
					type: "columns",
					blocks: [
						{
							type: "list",
							title: lang.top_message,
							icon: "💬",
							empty: lang.stats_no_data,
							rows: [
								firstActiveChannel,
								secondActiveChannel,
								thirdActiveChannel
							]
								.filter((id): id is string => !!id)
								.map((channelId) => ({
									...channelRow(channelId, "#"),
									value: String(
										getChannelMessagesCount(
											channelId,
											allMessages
										)
									),
									unit: lang.messages_word
								}))
						},
						{
							type: "list",
							title: lang.top_voice,
							icon: "🎤",
							accent: "#EB459E",
							empty: lang.stats_no_data,
							rows: [
								firstActiveVoiceChannel,
								secondActiveVoiceChannel,
								thirdActiveVoiceChannel
							]
								.filter((id): id is string => !!id)
								.map((channelId) => ({
									...channelRow(channelId, "🔊"),
									value: String(
										getChannelMinutesCount(
											channelId,
											allVoiceActivities
										)
									),
									unit: lang.minutes_word
								}))
						}
					]
				}
			]
		});

		const attachment = new AttachmentBuilder(image, { name: "image.png" });

		msg.edit({ content: null, files: [attachment] });
	}
};
