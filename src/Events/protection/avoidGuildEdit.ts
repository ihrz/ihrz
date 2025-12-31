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

/*
... (Your copyright and license information)
*/

import { Client, AuditLogEvent, Guild, PermissionFlagsBits, GuildMember } from 'discord.js';

import { BotEvent } from '../../../types/event.js';
import { getLogs } from './ready.js';

export const event: BotEvent = {
	name: "guildUpdate",
	run: async (client: Client, oldGuild: Guild, newGuild: Guild) => {
		const data = await client.db.get(`${newGuild.id}.PROTECTION`);
		if (!data) return;

		if (!oldGuild.members.me?.permissions.has([
			PermissionFlagsBits.Administrator
		])) return;

		if (data.updateguild) {
			const relevantLog = await getLogs({ guild: newGuild, target: newGuild.id, actionType: AuditLogEvent.GuildUpdate, type: 'PROTECTION' });
			if (!relevantLog) return;

			let user: GuildMember | undefined;
			let shouldSanction: boolean = false;

			if (data.updateguild.mode === 'allowlist') {
				const baseData = await client.db.get(`${newGuild.id}.ALLOWLIST.list.${relevantLog.executorId}`);

				if (!baseData) {
					user = newGuild.members.cache.get(relevantLog?.executorId as string) || undefined;
					shouldSanction = true;
				};
			} else if (data.updateguild.mode === 'nobody') {
				if (relevantLog.executorId !== newGuild.ownerId) {
					user = newGuild.members.cache.get(relevantLog?.executorId as string) || undefined;
					shouldSanction = true;
				};
			}
			const isOwner = await client.db.get(`${user?.guild.id}.OWNER.${user?.id}`)

			!isOwner && shouldSanction && (async () => {

				await client.func.method.punish(data, user!);

				if (oldGuild.afkChannel !== newGuild.afkChannel) {
					await newGuild.setAFKChannel(oldGuild.afkChannel).catch(() => false);
				}
				if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
					await newGuild.setAFKTimeout(oldGuild.afkTimeout).catch(() => false);
				}
				if (oldGuild.banner !== newGuild.banner) {
					await newGuild.setBanner(oldGuild.banner).catch(() => false);
				}
				if (oldGuild.defaultMessageNotifications !== newGuild.defaultMessageNotifications) {
					await newGuild.setDefaultMessageNotifications(oldGuild.defaultMessageNotifications).catch(() => false);
				}
				if (oldGuild.discoverySplash !== newGuild.discoverySplash) {
					await newGuild.setDiscoverySplash(oldGuild.discoverySplash).catch(() => false);
				}
				if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
					await newGuild.setExplicitContentFilter(oldGuild.explicitContentFilter).catch(() => false);
				}
				if (oldGuild.icon !== newGuild.icon) {
					await newGuild.setIcon(oldGuild.icon).catch(() => false);
				}
				if (oldGuild.mfaLevel !== newGuild.mfaLevel) {
					await newGuild.setMFALevel(oldGuild.mfaLevel).catch(() => false);
				}
				if (oldGuild.name !== newGuild.name) {
					await newGuild.setName(oldGuild.name).catch(() => false);
				}
				if (oldGuild.preferredLocale !== newGuild.preferredLocale) {
					await newGuild.setPreferredLocale(oldGuild.preferredLocale).catch(() => false);
				}
				if (oldGuild.premiumProgressBarEnabled !== newGuild.premiumProgressBarEnabled) {
					await newGuild.setPremiumProgressBarEnabled(oldGuild.premiumProgressBarEnabled).catch(() => false);
				}
			})()
		}
	},
};
