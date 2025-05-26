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

/* I was too lazy, i have bit used Claude AI (LLM Model) for this code base
- Anaïs Saraiva
*/

import { AuditLogEvent, Client, GuildMember, Role, Collection } from 'discord.js';
import { BotEvent } from '../../../types/event.js';
import { DatabaseStructure } from '../../../types/database_structure.js';

export const event: BotEvent = {
	name: "guildMemberUpdate",
	run: async (client: Client, oldMember: GuildMember, newMember: GuildMember) => {
		try {
			// Get the latest audit log entry for this member role update
			const auditLogs = await newMember.guild.fetchAuditLogs({
				type: AuditLogEvent.MemberRoleUpdate,
				limit: 5
			});

			// Find the most recent log entry for this user
			const relevantLog = auditLogs.entries.find(
				entry => entry.targetId === newMember.id &&
					Date.now() - entry.createdTimestamp < 5000 // Events from the last 5 seconds
			);

			// If no relevant audit log was found, exit
			if (!relevantLog) {
				return;
			}

			// Extract role changes from the audit log
			const changes = relevantLog.changes;

			// Find added roles
			let addedRoleIds: string[] = [];
			for (const change of changes) {
				if (change.key === '$add') {
					const roles = change.new as Array<{ id: string; name: string }>;
					addedRoleIds = roles.map(role => role.id);
					break;
				}
			}

			// If no roles were added, stop execution
			if (addedRoleIds.length === 0) {
				return;
			}

			// Collect the actual role objects
			const addedRoles = new Collection<string, Role>();
			for (const roleId of addedRoleIds) {
				const role = newMember.guild.roles.cache.get(roleId);
				if (role) {
					addedRoles.set(roleId, role);
				}
			}

			const roleLimits = await client.db.get(`${newMember.guild.id}.GUILD.UTILS.ROLE_LIMIT`) as DatabaseStructure.RoleLimitSchema;

			// If no limits are configured, stop execution
			if (!roleLimits) return;

			// For each added role, check if it has a limit
			for (const [roleId, role] of addedRoles) {
				// Check if this role has a limit
				const limit = roleLimits[roleId];

				// If the role has no defined limit, move to the next one
				if (!limit) continue;

				// Count how many members have this role
				const membersWithRole = newMember.guild.members.cache.filter(
					member => member.roles.cache.has(roleId)
				).size;

				// If the limit is exceeded, remove the role
				if (membersWithRole > limit) {
					await newMember.roles.remove(roleId, "[RoleLimit] - The limit of users is reached!");
				}
			}
		} catch { }
	},
};