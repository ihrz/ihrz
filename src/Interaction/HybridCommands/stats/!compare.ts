/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	AttachmentBuilder,
	ChatInputCommandInteraction,
	Client,
	Message,
	EmbedBuilder,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { SubCommand } from '../../../../types/command.js';
import {
	calculateMessageTime,
	calculateVoiceActivity,
} from "../../../core/functions/userStatsUtils.js";

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		if (!client.user || !interaction.guild || !interaction.channel) return;

		let user1Id: string | null = null;
		let user2Id: string | null = null;

		if (interaction instanceof ChatInputCommandInteraction) {
			const user1 = interaction.options.getUser('user1', true);
			const user2 = interaction.options.getUser('user2', true);
			user1Id = user1.id;
			user2Id = user2.id;
		} else {
			// Handle message command args parsing
			if (args && args.length >= 2) {
				const user1 = await client.func.method.user(interaction as Message, args, 0);
				const user2 = await client.func.method.user(interaction as Message, args, 1);
				if (user1) user1Id = user1.id;
				if (user2) user2Id = user2.id;
			}
		}

		if (!user1Id || !user2Id) {
			return await client.func.method.interactionSend(interaction, {
				content: lang.stats_compare_invalid_users
			});
		}

		const msg = await client.func.method.interactionSend(interaction, client.iHorizon_Emojis.Discord_Loading);

		const user1Data = await client.db.get(`${interaction.guildId}.STATS.USER.${user1Id}`) as DatabaseStructure.UserStats | null;
		const user2Data = await client.db.get(`${interaction.guildId}.STATS.USER.${user2Id}`) as DatabaseStructure.UserStats | null;

		if (!user1Data || !user2Data) {
			return await client.func.method.interactionSend(interaction, {
				content: lang.stats_compare_no_data
			});
		}

		const user1 = await client.users.fetch(user1Id).catch(() => null);
		const user2 = await client.users.fetch(user2Id).catch(() => null);

		const nowTimestamp = Date.now();
		const dailyTimeout = 86_400_000;
		const weeklyTimeout = 604_800_000;
		const monthlyTimeout = 2_592_000_000;

		// Calculate stats for user1
		let user1DailyMessages: DatabaseStructure.StatsMessage[] = [];
		let user1WeeklyMessages: DatabaseStructure.StatsMessage[] = [];
		let user1MonthlyMessages: DatabaseStructure.StatsMessage[] = [];
		let user1DailyVoice = 0;
		let user1WeeklyVoice = 0;
		let user1MonthlyVoice = 0;

		user1Data.messages?.forEach(msg => {
			const result = calculateMessageTime(msg, nowTimestamp, dailyTimeout, weeklyTimeout, monthlyTimeout, user1DailyMessages, user1WeeklyMessages, user1MonthlyMessages);
			user1DailyMessages = result.dailyMessages;
			user1WeeklyMessages = result.weeklyMessages;
			user1MonthlyMessages = result.monthlyMessages;
		});

		user1Data.voices?.forEach(voice => {
			const result = calculateVoiceActivity(voice, nowTimestamp, dailyTimeout, weeklyTimeout, monthlyTimeout, user1DailyVoice, user1WeeklyVoice, user1MonthlyVoice);
			user1DailyVoice = result.dailyVoiceActivity;
			user1WeeklyVoice = result.weeklyVoiceActivity;
			user1MonthlyVoice = result.monthlyVoiceActivity;
		});

		// Calculate stats for user2
		let user2DailyMessages: DatabaseStructure.StatsMessage[] = [];
		let user2WeeklyMessages: DatabaseStructure.StatsMessage[] = [];
		let user2MonthlyMessages: DatabaseStructure.StatsMessage[] = [];
		let user2DailyVoice = 0;
		let user2WeeklyVoice = 0;
		let user2MonthlyVoice = 0;

		user2Data.messages?.forEach(msg => {
			const result = calculateMessageTime(msg, nowTimestamp, dailyTimeout, weeklyTimeout, monthlyTimeout, user2DailyMessages, user2WeeklyMessages, user2MonthlyMessages);
			user2DailyMessages = result.dailyMessages;
			user2WeeklyMessages = result.weeklyMessages;
			user2MonthlyMessages = result.monthlyMessages;
		});

		user2Data.voices?.forEach(voice => {
			const result = calculateVoiceActivity(voice, nowTimestamp, dailyTimeout, weeklyTimeout, monthlyTimeout, user2DailyVoice, user2WeeklyVoice, user2MonthlyVoice);
			user2DailyVoice = result.dailyVoiceActivity;
			user2WeeklyVoice = result.weeklyVoiceActivity;
			user2MonthlyVoice = result.monthlyVoiceActivity;
		});

		const embed = new EmbedBuilder()
			.setTitle(lang.stats_compare_title)
			.setColor("#5865F2")
			.setDescription(`${user1?.username || lang.var_unknown} vs ${user2?.username || lang.var_unknown}`)
			.addFields(
				{
					name: `📨 ${lang.messages_word}`,
					value: `**${user1?.username || lang.var_unknown}**: ${user1MonthlyMessages.length} | **${user2?.username || lang.var_unknown}**: ${user2MonthlyMessages.length}`,
					inline: true
				},
				{
					name: `🎤 ${lang.voice_activity}`,
					value: `**${user1?.username || lang.var_unknown}**: ${client.timeCalculator.to_beautiful_string(user1MonthlyVoice, lang)} | **${user2?.username || lang.var_unknown}**: ${client.timeCalculator.to_beautiful_string(user2MonthlyVoice, lang)}`,
					inline: true
				},
				{
					name: lang.var_1d,
					value: `**${user1?.username || lang.var_unknown}**: ${user1DailyMessages.length} ${lang.messages_word}, ${client.timeCalculator.to_beautiful_string(user1DailyVoice, lang)}\n**${user2?.username || lang.var_unknown}**: ${user2DailyMessages.length} ${lang.messages_word}, ${client.timeCalculator.to_beautiful_string(user2DailyVoice, lang)}`,
					inline: false
				},
				{
					name: lang.var_7d,
					value: `**${user1?.username || lang.var_unknown}**: ${user1WeeklyMessages.length} ${lang.messages_word}, ${client.timeCalculator.to_beautiful_string(user1WeeklyVoice, lang)}\n**${user2?.username || lang.var_unknown}**: ${user2WeeklyMessages.length} ${lang.messages_word}, ${client.timeCalculator.to_beautiful_string(user2WeeklyVoice, lang)}`,
					inline: false
				},
				{
					name: lang.var_14d,
					value: `**${user1?.username || lang.var_unknown}**: ${user1MonthlyMessages.length} ${lang.messages_word}, ${client.timeCalculator.to_beautiful_string(user1MonthlyVoice, lang)}\n**${user2?.username || lang.var_unknown}**: ${user2MonthlyMessages.length} ${lang.messages_word}, ${client.timeCalculator.to_beautiful_string(user2MonthlyVoice, lang)}`,
					inline: false
				}
			)
			.setThumbnail(interaction.guild.iconURL({ size: 512 }) || null)
			.setTimestamp();

		msg.edit({ content: null, embeds: [embed] });
	},
};
