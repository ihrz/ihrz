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

import { Client, AuditLogEvent, GuildChannel, BaseGuildTextChannel, PermissionFlagsBits, GuildMember } from 'discord.js'

import { BotEvent } from '../../../types/event.js';
import { getLogs } from './ready.js';

export const event: BotEvent = {
	name: "webhooksUpdate",
	run: async (client: Client, channel: GuildChannel) => {

		const data = await client.db.get(`${channel.guild.id}.PROTECTION`);
		if (!data) return;

		if (!channel.guild.members.me?.permissions.has([
			PermissionFlagsBits.Administrator
		])) return;

		if (data.webhook) {
			const relevantLog = await getLogs({ guild: channel.guild, target: channel.id, actionType: AuditLogEvent.WebhookCreate, type: "PROTECTION" });
			if (!relevantLog) return;

			let user: GuildMember | undefined;
			let shouldSanction: boolean = false;

			if (data.webhook.mode === 'allowlist') {
				const baseData = await client.db.get(`${channel.guild.id}.ALLOWLIST.list.${relevantLog.executorId}`);

				if (!baseData) {
					user = channel.guild.members.cache.get(relevantLog?.executorId as string) || undefined;
					shouldSanction = true;
				};
			} else if (data.webhook.mode === 'nobody') {
				if (relevantLog.executorId !== channel.guild.ownerId) {
					user = channel.guild.members.cache.get(relevantLog?.executorId as string) || undefined;
					shouldSanction = true;
				};
			}

			shouldSanction && (async () => {
				await client.func.method.punish(data, user!);

				const webhooks = await (channel as BaseGuildTextChannel).fetchWebhooks();
				const myWebhooks = webhooks.filter((webhook) => webhook.id === relevantLog?.targetId!);

				for (const [id, webhook] of myWebhooks) await webhook.delete("Protect!");
			})()
		}
	},
};