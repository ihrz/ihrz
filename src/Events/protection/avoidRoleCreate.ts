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

import { Client, AuditLogEvent, Role, PermissionFlagsBits, GuildMember } from 'discord.js'

import { BotEvent } from '../../../types/event.js';
import { getLogs } from './ready.js';

export const event: BotEvent = {
	name: "roleCreate",
	run: async (client: Client, role: Role) => {

		const data = await client.db.get(`${role.guild.id}.PROTECTION`);
		if (!data) return;

		if (!role.guild.members.me?.permissions.has([
			PermissionFlagsBits.Administrator
		])) return;

		if (data.createrole) {
			const relevantLog = await getLogs(role.guild, role.id, AuditLogEvent.RoleCreate);
			if (!relevantLog) return;

			let user: GuildMember | undefined;
			let shouldSanction: boolean = false;

			if (data.createrole.mode === 'allowlist') {
				const baseData = await client.db.get(`${role.guild.id}.ALLOWLIST.list.${relevantLog.executorId}`);

				if (!baseData) {
					user = role.guild.members.cache.get(relevantLog?.executorId as string) || undefined;
					shouldSanction = true;
				};
			} else if (data.createrole.mode === 'nobody') {
				if (relevantLog.executorId !== role.guild.ownerId) {
					user = role.guild.members.cache.get(relevantLog?.executorId as string) || undefined;
					shouldSanction = true;
				};
			}

			shouldSanction && (async () => {
				await client.func.method.punish(data, user!);
				await role.delete('Protect!');
			})()
		}
	},
};