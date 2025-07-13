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

import { Client, AuditLogEvent, GuildBan, PermissionsBitField } from 'discord.js'
import { BotEvent } from '../../../types/event.js';
import { handledAuditLogEntries } from './ready.js';

export const event: BotEvent = {
	name: "guildBanAdd",
	run: async (client: Client, ban: GuildBan) => {

		const data = await client.db.get(`${ban.guild.id}.PROTECTION`);
		if (!data) return;

		if (data.banmembers && data.banmembers.mode === 'allowlist') {

			if (!ban.guild.members.me || !ban.guild.members.me.permissions.has([
				PermissionsBitField.Flags.ViewAuditLog,
				PermissionsBitField.Flags.ManageGuild
			])) return;

			const fetchedLogs = await ban.guild.fetchAuditLogs({
				type: AuditLogEvent.MemberBanAdd,
				limit: 5,
			});

			const relevantLog = fetchedLogs.entries.find(entry =>
				entry.targetId === ban.user.id &&
				entry.executorId !== client.user?.id &&
				entry.executorId
				// Window time for avoiding recursive:
				&& entry.createdTimestamp > (Date.now() - 10_000)
			);

			// Avoiding double action by filtering the user
			if (!relevantLog || relevantLog.executor?.id === client.user?.id || handledAuditLogEntries.has(relevantLog.id)) {
				return;
			}
			handledAuditLogEntries.add(relevantLog.id);
			const baseData = await client.db.get(`${ban.guild.id}.ALLOWLIST.list.${relevantLog.executorId}`);

			if (!baseData) {
				const user = ban.guild.members.cache.get(relevantLog?.executorId!);
				await ban.guild.bans.remove(ban.user.id);

				await client.func.method.punish(data, user);
			}
		}
	},
};