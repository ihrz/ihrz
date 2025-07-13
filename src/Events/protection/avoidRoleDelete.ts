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

import { Client, AuditLogEvent, Role, PermissionFlagsBits } from 'discord.js'

import { BotEvent } from '../../../types/event.js';
import { handledAuditLogEntries, protectionCache } from './ready.js';

export const event: BotEvent = {
	name: "roleDelete",
	run: async (client: Client, role: Role) => {

		const data = await client.db.get(`${role.guild.id}.PROTECTION`);
		if (!data) return;

		if (!role.guild.members.me?.permissions.has([
			PermissionFlagsBits.Administrator
		])) return;

		if (data.deleterole && data.deleterole.mode === 'allowlist') {
			const fetchedLogs = await role.guild.fetchAuditLogs({
				type: AuditLogEvent.RoleDelete,
				limit: 5,
			});

			const relevantLog = fetchedLogs.entries.find(entry =>
				entry.targetId === role.id &&
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
			const baseData = await client.db.get(`${role.guild.id}.ALLOWLIST.list.${relevantLog.executorId}`);

			if (!baseData) {
				const member = role.guild.members.cache.get(relevantLog?.executorId as string);
				await client.func.method.punish(data, member);

				const newRole = await role.guild.roles.create({
					...role, reason: `Role re-create by Protect (${relevantLog.executorId} break the rule!)`,
				});

				await newRole.setPosition(role.rawPosition);

				let fetched_data = protectionCache.data.get(role.guild.id)?.roles.find(x => x.id === role.id)?.members || [];
				if (fetched_data) {
					for (let entry of fetched_data) {
						let user = role.guild.members.cache.get(entry);
						if (user) {
							user.roles.add(newRole.id);
						}
					}
				}
			};
		}
	},
};