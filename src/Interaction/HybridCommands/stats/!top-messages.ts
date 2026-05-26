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
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		if (!client.user || !interaction.guild || !interaction.channel) return;

		let period: "daily" | "weekly" | "monthly" = "monthly";
		let limit = 10;

		if (interaction instanceof ChatInputCommandInteraction) {
			const periodOption = interaction.options.getString('period');
			if (periodOption && ['daily', 'weekly', 'monthly'].includes(periodOption)) {
				period = periodOption as "daily" | "weekly" | "monthly";
			}
			limit = interaction.options.getInteger('limit') || 10;
		} else {
			// Handle message command args parsing if needed
			if (args && args.length > 0) {
				const periodArg = args[0]?.toLowerCase();
				if (['daily', 'weekly', 'monthly'].includes(periodArg)) {
					period = periodArg as "daily" | "weekly" | "monthly";
				}
				if (args[1] && !isNaN(parseInt(args[1]))) {
					limit = Math.min(Math.max(parseInt(args[1]), 5), 25);
				}
			}
		}

		const msg = await client.func.method.interactionSend(interaction, client.iHorizon_Emojis.Discord_Loading);

		const res = await client.db.get(`${interaction.guildId}.STATS`) as DatabaseStructure.GuildStats | null;

		if (!res || !res.USER) {
			await msg.edit({ content: lang.stats_no_data });
			return;
		}

		const nowTimestamp = Date.now();
		const dailyTimeout = 86_400_000;
		const weeklyTimeout = 604_800_000;
		const monthlyTimeout = 2_592_000_000;

		const timeout = period === "daily" ? dailyTimeout : period === "weekly" ? weeklyTimeout : monthlyTimeout;

		const leaderboardData: {
			memberId: string,
			member: any,
			messages: number
		}[] = [];

		for (const memberId in res.USER) {
			const userData = res.USER[memberId];
			let messageCount = 0;

			userData.messages?.forEach(message => {
				if (nowTimestamp - message.sentTimestamp <= timeout) {
					messageCount++;
				}
			});

			if (messageCount > 0) {
				const user = await client.users.fetch(memberId).catch(() => null);
				leaderboardData.push({
					memberId,
					member: user,
					messages: messageCount
				});
			}
		}

		leaderboardData.sort((a, b) => b.messages - a.messages);
		const topUsers = leaderboardData.slice(0, limit);

		let htmlContent = client.htmlfiles['topMessagesLeaderboard'];

		const periodLabel = period === "daily" ? lang.var_1d : period === "weekly" ? lang.var_7d : lang.var_14d;
		const currentDate = new Date().toLocaleDateString(await client.db.get(`${interaction.guildId}.LANG.lang`) || "en-US", {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});

		htmlContent = htmlContent
			.replaceAll('{header_h1_value}', lang.top_messages_title)
			.replaceAll("{guild_pfp}", interaction.guild.iconURL({ size: 512 }) || client.user.displayAvatarURL({ size: 512 }))
			.replaceAll("{author_username}", interaction.guild.name)
			.replaceAll("{member_count}", interaction.guild.memberCount.toString())
			.replaceAll("{current_date}", currentDate)
			.replaceAll("{period_label}", periodLabel)
			.replaceAll('{top_message_users}', topUsers.map((user, index) => {
				const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
				return `
        <div class="list-item">
            <div class="rank ${rankClass}">${index + 1}</div>
            <img class="avatar" src="${user.member?.displayAvatarURL({ size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="User">
            <div class="info">
                <div class="name">@${user.member?.username || lang.var_unknown}</div>
                <div class="detail">${lang.var_total}: ${user.messages} ${lang.messages_word}</div>
            </div>
            <div class="stat">${user.messages} <span>${lang.messages_word}</span></div>
        </div>
        `;
			}).join(''))
			.replaceAll('{top_active_users_title}', lang.top_active_users_title)
			.replaceAll('{var_members}', lang.var_members);

		const image = await client.func.html2png(htmlContent, {
			width: 1902,
			height: Math.min(1080, 200 + (topUsers.length * 120)),
			scaleSize: 3,
			elementSelector: '.container',
			omitBackground: true,
			selectElement: true,
		});

		const attachment = new AttachmentBuilder(image, { name: 'top-messages.png' });

		await msg.edit({ content: null, files: [attachment] });
	},
};
