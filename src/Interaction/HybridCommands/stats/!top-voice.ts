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
	Message
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";
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

		let period: "daily" | "weekly" | "monthly" = "monthly";
		let limit = 10;

		if (interaction instanceof ChatInputCommandInteraction) {
			const periodOption = interaction.options.getString("period");
			if (
				periodOption &&
				["daily", "weekly", "monthly"].includes(periodOption)
			) {
				period = periodOption as "daily" | "weekly" | "monthly";
			}
			limit = interaction.options.getInteger("limit") || 10;
		} else {
			if (args && args.length > 0) {
				const periodArg = args[0]?.toLowerCase();
				if (["daily", "weekly", "monthly"].includes(periodArg)) {
					period = periodArg as "daily" | "weekly" | "monthly";
				}
				if (args[1] && !isNaN(parseInt(args[1]))) {
					limit = Math.min(Math.max(parseInt(args[1]), 5), 25);
				}
			}
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

		const timeout =
			period === "daily"
				? dailyTimeout
				: period === "weekly"
					? weeklyTimeout
					: monthlyTimeout;

		const leaderboardData: {
			memberId: string;
			member: any;
			voiceDuration: number;
		}[] = [];

		for (const memberId in res.USER) {
			const userData = res.USER[memberId];
			let voiceDuration = 0;

			userData.voices?.forEach((voice) => {
				if (nowTimestamp - voice.endTimestamp <= timeout) {
					voiceDuration += voice.endTimestamp - voice.startTimestamp;
				}
			});

			if (voiceDuration > 0) {
				const user = await client.users
					.fetch(memberId)
					.catch(() => null);
				leaderboardData.push({
					memberId,
					member: user,
					voiceDuration
				});
			}
		}

		leaderboardData.sort((a, b) => b.voiceDuration - a.voiceDuration);
		const topUsers = leaderboardData.slice(0, limit);

		const periodLabel =
			period === "daily"
				? lang.var_1d
				: period === "weekly"
					? lang.var_7d
					: lang.var_14d;
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

		const [guildIcon, avatars] = await Promise.all([
			fetchAvatar(
				interaction.guild.iconURL({ size: 256, extension: "png" }) ||
					client.user.displayAvatarURL({
						size: 256,
						extension: "png"
					})
			),
			Promise.all(
				topUsers.map((user) =>
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
			title: lang.top_voice_title,
			meta: [
				`${interaction.guild.memberCount} ${lang.var_members}`,
				periodLabel
			],
			avatar: guildIcon,
			accent: "#EB459E",
			footer: lang.stats_generated_on.replace("{date}", currentDate),
			blocks: [
				{
					type: "list",
					title: lang.top_active_users_title,
					icon: "🎤",
					empty: lang.stats_no_data,
					rows: topUsers.map((user, index) => {
						const voiceTime =
							client.timeCalculator.to_beautiful_string(
								user.voiceDuration,
								lang
							);
						return {
							avatar: avatars[index],
							name: `@${user.member?.username || lang.var_unknown}`,
							detail: `${lang.var_total}: ${voiceTime}`,
							value: voiceTime,
							unit: lang.voice_activity
						};
					})
				}
			]
		});

		const attachment = new AttachmentBuilder(image, {
			name: "top-voice.png"
		});

		msg.edit({ content: null, files: [attachment] });
	}
};
