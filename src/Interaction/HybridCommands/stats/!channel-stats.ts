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
				| TextChannel
				| VoiceChannel;
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
					| TextChannel
					| VoiceChannel;
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

		let htmlContent = client.htmlfiles["channelStatsPage"];

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

		htmlContent = htmlContent
			.replaceAll("{header_h1_value}", lang.channel_stats_title)
			.replaceAll(
				"{guild_pfp}",
				interaction.guild.iconURL({ size: 512 }) ||
					client.user.displayAvatarURL({ size: 512 })
			)
			.replaceAll("{author_username}", interaction.guild.name)
			.replaceAll("{channel_name}", targetChannel.name)
			.replaceAll("{current_date}", currentDate)
			.replaceAll("{daily_messages}", dailyMessages.toString())
			.replaceAll("{weekly_messages}", weeklyMessages.toString())
			.replaceAll("{monthly_messages}", monthlyMessages.toString())
			.replaceAll(
				"{daily_voice}",
				client.timeCalculator.to_beautiful_string(dailyVoice, lang)
			)
			.replaceAll(
				"{weekly_voice}",
				client.timeCalculator.to_beautiful_string(weeklyVoice, lang)
			)
			.replaceAll(
				"{monthly_voice}",
				client.timeCalculator.to_beautiful_string(monthlyVoice, lang)
			)
			.replaceAll("{total_messages}", totalMessages.toString())
			.replaceAll(
				"{total_voice}",
				client.timeCalculator.to_beautiful_string(totalVoice, lang)
			)
			.replaceAll("{active_users}", activeUsers.toString())
			.replaceAll("{var_1d}", lang.var_1d || "Daily")
			.replaceAll("{var_7d}", lang.var_7d || "Weekly")
			.replaceAll("{var_14d}", lang.var_14d || "Monthly")
			.replaceAll("{var_total}", lang.var_total || "Total")
			.replaceAll("{messages_word}", lang.messages_word || "Messages")
			.replaceAll(
				"{voice_activity}",
				lang.voice_activity || "Voice Activity"
			)
			.replaceAll(
				"{top_message_users}",
				isTextChannel && topMessageUsersResolved.length > 0
					? topMessageUsersResolved
							.map((item, index) => {
								const rankClass =
									index === 0
										? "rank-1"
										: index === 1
											? "rank-2"
											: index === 2
												? "rank-3"
												: "";
								return `
        <div class="list-item">
            <div class="rank ${rankClass}">${index + 1}</div>
            <img class="avatar" src="${item.user?.displayAvatarURL({ size: 128 }) || "https://cdn.discordapp.com/embed/avatars/0.png"}" alt="User">
            <div class="info">
                <div class="name">@${item.user?.username || lang.var_unknown}</div>
                <div class="detail">${item.count} ${lang.messages_word}</div>
            </div>
            <div class="stat">${item.count} <span>${lang.messages_word}</span></div>
        </div>
        `;
							})
							.join("")
					: '<div class="empty-state"><div class="empty-state-icon">📭</div><div>' +
							"</div></div>"
			)
			.replaceAll(
				"{top_voice_users}",
				isVoiceChannel && topVoiceUsersResolved.length > 0
					? topVoiceUsersResolved
							.map((item, index) => {
								const rankClass =
									index === 0
										? "rank-1"
										: index === 1
											? "rank-2"
											: index === 2
												? "rank-3"
												: "";
								return `
        <div class="list-item">
            <div class="rank ${rankClass}">${index + 1}</div>
            <img class="avatar" src="${item.user?.displayAvatarURL({ size: 128 }) || "https://cdn.discordapp.com/embed/avatars/0.png"}" alt="User">
            <div class="info">
                <div class="name">@${item.user?.username || lang.var_unknown}</div>
                <div class="detail">${client.timeCalculator.to_beautiful_string(item.duration, lang)}</div>
            </div>
            <div class="stat">${client.timeCalculator.to_beautiful_string(item.duration, lang)}</div>
        </div>
        `;
							})
							.join("")
					: '<div class="empty-state"><div class="empty-state-icon">🔇</div><div>' +
							lang.var_none +
							"</div></div>"
			)
			.replaceAll(
				"{show_messages_section}",
				isTextChannel ? "block" : "none"
			)
			.replaceAll(
				"{show_voice_section}",
				isVoiceChannel ? "block" : "none"
			)
			.replaceAll("{top_messages_title}", lang.top_messages_title)
			.replaceAll("{top_voice_title}", lang.top_voice_title)
			.replaceAll("{channel_stats_title}", lang.channel_stats_title)
			.replaceAll("{top_active_users_title}", lang.top_active_users_title)
			.replaceAll("{active_users_title}", lang.active_users_title);

		const image = await client.func.html2png(htmlContent, {
			width: 1902,
			height: 1400,
			scaleSize: 3,
			elementSelector: ".container",
			omitBackground: true,
			selectElement: true
		});

		const attachment = new AttachmentBuilder(image, {
			name: "channel-stats.png"
		});

		msg.edit({ content: null, files: [attachment] });
	}
};
