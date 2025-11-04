/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { Client, AuditLogEvent, Role, PermissionFlagsBits, GuildMember, ColorResolvable } from 'discord.js'

import { BotEvent } from '../../../types/event.js';
import { getLogs } from './ready.js';

export const event: BotEvent = {
	name: "roleUpdate",
	run: async (client: Client, oldRole: Role, newRole: Role) => {

		const data = await client.db.get(`${newRole.guild.id}.PROTECTION`);
		if (!data) return;

		if (!newRole.guild.members.me?.permissions.has([
			PermissionFlagsBits.Administrator
		])) return;

		if (data.updaterole) {
			const relevantLog = await getLogs({ guild: newRole.guild, target: oldRole.id, actionType: AuditLogEvent.RoleUpdate, type: "PROTECTION" });
			if (!relevantLog) return;

			let user: GuildMember | undefined;
			let shouldSanction: boolean = false;

			if (data.updaterole.mode === 'allowlist') {
				const baseData = await client.db.get(`${newRole.guild.id}.ALLOWLIST.list.${relevantLog.executorId}`);

				if (!baseData) {
					user = newRole.guild.members.cache.get(relevantLog?.executorId as string) || undefined;
					shouldSanction = true;
				};

			} else if (data.updaterole.mode === 'nobody') {
				if (relevantLog.executorId !== newRole.guild.ownerId) {
					user = newRole.guild.members.cache.get(relevantLog?.executorId as string) || undefined;
					shouldSanction = true;
				};
			}

			shouldSanction && (async () => {
				await client.func.method.punish(data, user!);

				await newRole.edit({
					...oldRole,
					colors: {
						primaryColor: oldRole.colors.primaryColor,
						secondaryColor: oldRole.colors.secondaryColor as ColorResolvable,
						tertiaryColor: oldRole.colors.tertiaryColor as ColorResolvable
					}
				});
			})()
		}
	},
};