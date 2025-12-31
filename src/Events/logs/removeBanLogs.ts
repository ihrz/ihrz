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

import { BaseGuildTextChannel, Client, EmbedBuilder, PermissionsBitField, AuditLogEvent, GuildBan, PermissionFlagsBits, User } from 'discord.js';

import { BotEvent } from '../../../types/event.js';
import { getLogs, handledAuditLogEntrie_logs, handledAuditLogEntries } from '../protection/ready.js';

export const event: BotEvent = {
	name: "guildBanRemove",
	run: async (client: Client, ban: GuildBan) => {
		const data = await client.func.getLanguageData(ban.guild.id);

		if (!ban.guild.members.me
			|| !ban.guild.members.me.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;

		if (!ban.guild.members.me?.permissions.has([
			PermissionFlagsBits.Administrator
		])) return;

		const someinfo = await client.db.get(`${ban.guild.id}.GUILD.SERVER_LOGS.moderation`);

		if (!someinfo) return;

		const Msgchannel = ban.guild.channels.cache.get(someinfo);
		if (!Msgchannel) return;

		const relevantLog = await getLogs({ guild: ban.guild, target: ban.user.id, actionType: AuditLogEvent.MemberBanRemove, type: "LOGS" });

		if (!relevantLog) {
			return;
		}

		let user = relevantLog.target as User;

		const logsEmbed = new EmbedBuilder()
			.setColor("#010101")
			.setDescription(data.event_srvLogs_banRemove_description
				.replace("${firstEntry.executor.id}", relevantLog?.executor?.id!)
				.replace("${firstEntry.target.username}", user.username)
			)
			.addFields({
				name: data.event_srvLogs_banAdd_fields_name,
				value: data.event_srvLogs_banAdd_fields_value.replace('{reason}', relevantLog?.reason || data.blacklist_var_no_reason)
			})
			.setTimestamp();

		await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
	},
};