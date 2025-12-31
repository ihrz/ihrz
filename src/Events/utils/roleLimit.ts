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

/* I was too lazy, i have bit used Claude AI (LLM Model) for this file
- Anaïs Saraiva
*/

import { AuditLogEvent, Client, GuildMember, Role, Collection } from 'discord.js';
import { BotEvent } from '../../../types/event.js';
import { DatabaseStructure } from '../../../types/database_structure.js';
import { getLogs, handledAuditLogEntrie_logs, handledAuditLogEntries } from '../protection/ready.js';

export const event: BotEvent = {
	name: "guildMemberUpdate",
	run: async (client: Client, oldMember: GuildMember, newMember: GuildMember) => {
		try {
			// Get the latest audit log entry for this member role update
			const relevantLog = await getLogs({ guild: newMember.guild, target: newMember.id, actionType: AuditLogEvent.MemberRoleUpdate, type: "NONE" });

			// If no relevant audit log was found, exit
			if (!relevantLog) {
				return;
			}

			// Extract role changes from the audit log
			const changes = relevantLog.changes;

			// Find added and removed roles
			let addedRoleIds: string[] = [];
			let removedRoleIds: string[] = [];

			for (const change of changes) {
				if (change.key === '$add') {
					const roles = change.new as Array<{ id: string; name: string }>;
					addedRoleIds = roles.map(role => role.id);
				} else if (change.key === '$remove') {
					const roles = change.new as Array<{ id: string; name: string }>;
					removedRoleIds = roles.map(role => role.id);
				}
			}

			// Combine both added and removed roles to update
			const affectedRoleIds = [...new Set([...addedRoleIds, ...removedRoleIds])];

			// If no roles were changed, stop execution
			if (affectedRoleIds.length === 0) {
				return;
			}

			const roleLimits = await client.db.get(`${newMember.guild.id}.GUILD.UTILS.ROLE_LIMIT`) as DatabaseStructure.RoleLimitSchema;

			// If no limits are configured, stop execution
			if (!roleLimits) return;

			// Helper function to update role name
			const updateRoleName = async (roleId: string) => {
				const limit = roleLimits[roleId];

				// If this role has no limit configured, skip it
				if (!limit) return;

				let role = newMember.guild.roles.cache.get(roleId) || await newMember.guild.roles.fetch(roleId).catch(() => null);

				if (!role) return;

				// Count how many members have this role
				const membersWithRole = newMember.guild.members.cache.filter(
					member => member.roles.cache.has(roleId)
				).size;

				// Extract base role name (remove existing counter if present)
				let baseRoleName = role.name;
				const counterRegex = /\s*\[\d+\/\d+\]\s*$/;
				if (counterRegex.test(baseRoleName)) {
					baseRoleName = baseRoleName.replace(counterRegex, '').trim();
				}

				// Update role name with counter
				const newRoleName = `${baseRoleName} [${membersWithRole}/${limit}]`;

				try {
					await role.setName(newRoleName, "[RoleLimit] - Updating role counter");
				} catch (error) {
					console.error(`Failed to update role name: ${error}`);
				}
			};

			// Update all affected roles
			for (const roleId of affectedRoleIds) {
				await updateRoleName(roleId);
			}

			// Check if any added roles exceed the limit
			for (const roleId of addedRoleIds) {
				const limit = roleLimits[roleId];

				if (!limit) continue;

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