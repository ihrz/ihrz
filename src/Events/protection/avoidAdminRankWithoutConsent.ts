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

import { Client, AuditLogEvent, GuildMember, Role, PermissionFlagsBits } from 'discord.js'

import { BotEvent } from '../../../types/event.js';
import { handledAuditLogEntries } from './ready.js';

export const event: BotEvent = {
	name: "guildMemberUpdate",
	run: async (client: Client, oldMember: GuildMember, newMember: GuildMember) => {

		const data = await client.db.get(`${newMember.guild.id}.PROTECTION`);
		if (!data) return;


		if (data.add_admin_roles && data.add_admin_roles.mode === 'allowlist') {
			const fetchedLogs = await oldMember.guild.fetchAuditLogs({
				type: AuditLogEvent.MemberRoleUpdate,
				limit: 5
			});

			const relevantLog = fetchedLogs.entries.find(entry =>
				entry.targetId === oldMember.id &&
				entry.executorId !== client.user?.id &&
				entry.executorId
				// Window time for avoiding recursive:
				&& entry.createdTimestamp > (Date.now() - 10_000)
			);

			// Avoiding double action by filtering the user
			if (!relevantLog || relevantLog.executor?.id === client.user?.id || handledAuditLogEntries.has(relevantLog.id)) {
				return;
			}

			// Only check if the event have gave a role; Not a sub;
			let search_for_a_add = relevantLog.changes.filter(x => x.key === "$add");
			if (!search_for_a_add) {
				return;
			}
			handledAuditLogEntries.add(relevantLog.id);

			// If the "raid" ocure on phone, the array is not with only one object 
			// (cause on phone we have the way) to add/remove multiple roles.
			// So need to handle all the roles.
			let all_roles_added: { name?: string; id: string }[] = search_for_a_add
				.flatMap(x => x.new ?? [])
				.filter(Boolean);

			let all_added_roles_fetched: Role[] = [];

			for (let role of all_roles_added) {
				await oldMember.guild.roles.fetch(role.id)
					.then(role =>
						all_added_roles_fetched.push(role!)
					)
					.catch(() => null);
			}

			let filtered_admin_role = all_added_roles_fetched.filter(x => x.permissions.has(PermissionFlagsBits.Administrator));

			// Canceling cause the member doesn't have gave admin role(s)
			if (!filtered_admin_role || filtered_admin_role.length === 0) {
				return;
			}

			const baseData = await client.db.get(`${newMember.guild.id}.ALLOWLIST.list.${relevantLog.executorId}`);

			if (!baseData) {
				const user = newMember.guild.members.cache.get(relevantLog?.executorId as string);
				await client.func.method.punish(data, user);

				await newMember.roles.set(oldMember.roles.cache, "[Protection] AntiRaid (try to gave admin role)").catch(() => false);
			};
		}
	},
};