/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	AuditLogEvent,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Message,
	time,
} from 'discord.js'
import { LanguageData } from '../../../../types/languageData.js';
import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		if (interaction instanceof ChatInputCommandInteraction) {
			var user = interaction.options.getUser("user")
		} else {
			var user = await client.func.method.user(interaction, args!, 0);
		}

		if (!user) {
			await client.func.method.interactionSend(interaction, {
				content: lang.baninfo_user_not_found
			})
			return;
		}

		let ban_info;
		try {
			ban_info = await interaction.guild?.bans.fetch(user.id);
		} catch {
			ban_info = null;
		}

		if (!ban_info) {
			await client.func.method.interactionSend(interaction, {
				content: lang.baninfo_not_banned
			})
			return;
		}

		const auditLogs = await interaction.guild?.fetchAuditLogs({
			type: AuditLogEvent.MemberBanAdd,
			limit: 100
		});

		const banLog = auditLogs?.entries.find(log =>
			log.target?.id === user!.id &&
			log.action === AuditLogEvent.MemberBanAdd
		);

		const embed = new EmbedBuilder()
			.setTitle(`${lang.baninfo_ban_info}: ${user.displayName}`)
			.setColor(await client.db.get(`${interaction.guild!.id}.GUILD.GUILD_CONFIG.embed_color.all`) || "#4fdb12")
			.setDescription(
				`> 🕒 **${lang.var_ban_date}:** ${time(banLog?.createdAt || new Date())}
           > 👤 **${lang.var_banned_by}:** ${banLog?.executor?.tag || lang.var_unknown}
           > 📝 **${lang.var_reason}:** ${ban_info.reason || lang.blacklist_var_no_reason}`
			)
			.setThumbnail(user.displayAvatarURL({ extension: "gif", forceStatic: false, size: 4096 }));

		await client.func.method.interactionSend(interaction, {
			embeds: [embed]
		});
		return;
	},
};