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

import { AuditLogEvent, Client, EmbedBuilder, GuildMember, PermissionsBitField } from 'discord.js';
import { BotEvent } from '../../../types/event.js';
import { getLogs, handledAuditLogEntrie_logs, handledAuditLogEntries } from '../protection/ready.js';

export const event: BotEvent = {
	name: "guildMemberAdd",
	run: async (client: Client, member: GuildMember) => {

		// Avoid all upside down if user is not bot
		if (member.user.bot === true) return;

		const data = await client.db.get(`${member.guild.id}.GUILD.BLOCK_BOT`) || false;

		if (!member.guild.members.me?.permissions.has([
			PermissionsBitField.Flags.Administrator
		])) return;

		const filteredLog = await getLogs(member.guild, member.id, AuditLogEvent.BotAdd, 2);
		const executor = member.guild.members.cache.get(filteredLog?.executorId!);

		if (data === true && filteredLog?.executorId !== member.guild.ownerId) {
			await member.ban({ reason: 'The BlockBot function are enable!' });
			await client.func.method.punish({ SANCTION: "simply+derank" }, executor, "Attempt to add an discord bot into this guild! -> Derank");

			const owner = member.guild.members.cache.get(member.guild.ownerId);
			const lang = await client.func.getLanguageData(member.guild.id);

			const embed = new EmbedBuilder()
				.setColor(2829617)
				.setTitle(lang.protection_blockbot_embed_title.replace("${member.guild.name}", member.guild.name))
				.setDescription(lang.protection_blockbot_embed_desc)
				.setFields(
					{ name: lang.var_user, value: filteredLog?.executor?.toString() || `\`${lang.var_not_detected}\``, inline: true },
					{ name: lang.var_target_bot, value: member.toString(), inline: true },
				)
				.setTimestamp()
				.setFooter(await client.func.displayBotName.footerBuilder(member.guild.id));

			owner?.send({ embeds: [embed], files: [await client.func.displayBotName.footerAttachmentBuilder(member.guild)] })
				.catch(() => { })
				.then(() => { });
		};
	},
};