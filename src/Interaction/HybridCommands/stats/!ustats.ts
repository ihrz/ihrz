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
	GuildMember,
	Message
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";

import { DatabaseStructure } from "../../../../types/database_structure.js";

import {
	calculateMessageTime,
	calculateVoiceActivity,
	calculateActiveChannels,
	calculateActiveVoiceChannels,
	getChannelName,
	getChannelMessagesCount,
	getChannelMinutesCount
} from "../../../core/functions/userStatsUtils.js";
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
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		let member: GuildMember;

		if (interaction instanceof ChatInputCommandInteraction) {
			member = (interaction.options.getMember("member") ||
				interaction.member) as GuildMember;
		} else {
			member = (client.func.method.member(interaction, args!, 0) ||
				interaction.member) as GuildMember;
		}

		const msg = await client.func.method.interactionSend(
			interaction,
			client.iHorizon_Emojis.Discord_Loading
		);

		const res = (await client.db.get(
			`${interaction.guildId}.STATS.USER.${member.user.id}`
		)) as DatabaseStructure.UserStats | null;

		if (!res) {
			return await client.func.method.interactionSend(interaction, {
				content: lang.unblacklist_user_is_not_exist
			});
		}

		let monthlyVoiceActivity = 0;
		let weeklyVoiceActivity = 0;
		let dailyVoiceActivity = 0;

		let monthlyMessages: DatabaseStructure.StatsMessage[] = [];
		let weeklyMessages: DatabaseStructure.StatsMessage[] = [];
		let dailyMessages: DatabaseStructure.StatsMessage[] = [];
		const totalMessages: number = res.messages?.length || 0;

		const nowTimestamp = Date.now();

		const dailyTimeout = 86_400_000; // 24 hours in ms
		const weeklyTimeout = 604_800_000; // One week in ms
		const monthlyTimeout = 2_592_000_000; // One month in ms

		let firstActiveVoiceChannel = "";
		let secondActiveVoiceChannel = "";
		let thirdActiveVoiceChannel = "";

		let firstActiveChannel = "";
		let secondActiveChannel = "";
		let thirdActiveChannel = "";

		res.messages?.forEach((msg) => {
			const result = calculateMessageTime(
				msg,
				nowTimestamp,
				dailyTimeout,
				weeklyTimeout,
				monthlyTimeout,
				dailyMessages,
				weeklyMessages,
				monthlyMessages
			);
			dailyMessages = result.dailyMessages;
			weeklyMessages = result.weeklyMessages;
			monthlyMessages = result.monthlyMessages;
		});

		res.voices?.forEach((voice) => {
			const result = calculateVoiceActivity(
				voice,
				nowTimestamp,
				dailyTimeout,
				weeklyTimeout,
				monthlyTimeout,
				dailyVoiceActivity,
				weeklyVoiceActivity,
				monthlyVoiceActivity
			);
			dailyVoiceActivity = result.dailyVoiceActivity;
			weeklyVoiceActivity = result.weeklyVoiceActivity;
			monthlyVoiceActivity = result.monthlyVoiceActivity;
		});

		const activeChannels = calculateActiveChannels(res.messages || []);
		firstActiveChannel = activeChannels.firstActiveChannel;
		secondActiveChannel = activeChannels.secondActiveChannel;
		thirdActiveChannel = activeChannels.thirdActiveChannel;

		const activeVoiceChannels = calculateActiveVoiceChannels(
			res.voices || []
		);
		firstActiveVoiceChannel = activeVoiceChannels.firstActiveVoiceChannel;
		secondActiveVoiceChannel = activeVoiceChannels.secondActiveVoiceChannel;
		thirdActiveVoiceChannel = activeVoiceChannels.thirdActiveVoiceChannel;

		const messageDataArray = Array(30).fill(0);
		const voiceDataArray = Array(30).fill(0);

		// Counted once (the old code ran this loop twice: doubled curve).
		monthlyMessages.forEach((msg) => {
			const dayIndex = Math.floor(
				(nowTimestamp - msg.sentTimestamp) / 86400000
			);
			if (dayIndex >= 0 && dayIndex < 30) {
				messageDataArray[29 - dayIndex] += 1;
			}
		});

		(res.voices || []).forEach((voice) => {
			const dayIndex = Math.floor(
				(nowTimestamp - voice.startTimestamp) / 86400000
			);
			if (dayIndex >= 0 && dayIndex < 30) {
				const sessionDuration =
					(voice.endTimestamp - voice.startTimestamp) / 1000 / 60;
				voiceDataArray[29 - dayIndex] += sessionDuration;
			}
		});

		const timeLabels = Array.from({ length: 30 }, (_, i) => {
			const date = new Date(
				nowTimestamp - (29 - i) * 24 * 60 * 60 * 1000
			);
			return date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric"
			});
		});

		const duration = (ms: number) =>
			String(client.timeCalculator.to_beautiful_string(ms, lang));
		const displayName = member.user.globalName || member.user.displayName;

		const messageRows = [
			firstActiveChannel,
			secondActiveChannel,
			thirdActiveChannel
		]
			.filter((id) => !!id)
			.map((channelId) => ({
				icon: "#",
				name: String(getChannelName(interaction.guild!, channelId)),
				value: String(
					getChannelMessagesCount(channelId, res.messages || [])
				),
				unit: lang.messages_word
			}));
		const voiceRows = [
			firstActiveVoiceChannel,
			secondActiveVoiceChannel,
			thirdActiveVoiceChannel
		]
			.filter((id) => !!id)
			.map((channelId) => ({
				icon: "🔊",
				name: String(getChannelName(interaction.guild!, channelId)),
				value: duration(
					getChannelMinutesCount(channelId, res.voices || []) * 60_000
				)
			}));

		// Same size as the HTML card this replaces: 1920x1200 at 1x.
		const image = await renderStatsPage({
			width: 1920,
			height: 1200,
			scale: 1,
			title: lang.header_h1_value.replace(
				"{author_username}",
				displayName
			),
			meta: [
				interaction.guild.name,
				`${totalMessages} ${lang.messages_word}`
			],
			avatar: await fetchAvatar(
				member.user.displayAvatarURL({ size: 256, extension: "png" })
			),
			footer: lang.stats_generated_on.replace(
				"{date}",
				new Date().toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric"
				})
			),
			blocks: [
				{
					type: "columns",
					blocks: [
						{
							type: "metrics",
							title: lang.messages_word,
							icon: "💬",
							items: [
								{
									value: String(dailyMessages.length),
									label: lang.var_1d
								},
								{
									value: String(weeklyMessages.length),
									label: lang.var_7d
								},
								{
									value: String(monthlyMessages.length),
									label: lang.var_14d
								}
							]
						},
						{
							type: "metrics",
							title: lang.voice_activity,
							icon: "🔊",
							accent: "#EB459E",
							items: [
								{
									value: duration(dailyVoiceActivity),
									label: lang.var_1d
								},
								{
									value: duration(weeklyVoiceActivity),
									label: lang.var_7d
								},
								{
									value: duration(monthlyVoiceActivity),
									label: lang.var_14d
								}
							]
						}
					]
				},
				{
					type: "columns",
					blocks: [
						{
							type: "list",
							title: lang.top_message,
							icon: "📊",
							empty: lang.var_none,
							rows: messageRows
						},
						{
							type: "list",
							title: lang.top_voice,
							icon: "🏆",
							accent: "#EB459E",
							empty: lang.var_none,
							rows: voiceRows
						}
					]
				},
				{
					type: "chart",
					title: lang.activity_under_30d,
					icon: "📈",
					labels: timeLabels,
					series: [
						{
							name: lang.messages_word,
							color: "#5865F2",
							values: messageDataArray
						},
						{
							name: `${lang.voice_activity} (${lang.minutes_word})`,
							color: "#EB459E",
							values: voiceDataArray
						}
					],
					height: "fill"
				}
			]
		});

		const attachment = new AttachmentBuilder(image, { name: "image.png" });

		msg.edit({ content: null, files: [attachment] });
	}
};
