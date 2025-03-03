/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { Client, AuditLogEvent, GuildChannel, ChannelType, CategoryChannel, TextChannel, PermissionFlagsBits } from 'discord.js';
import { BotEvent } from '../../../types/event.js';
import { protectionCache } from './ready.js';
import wait from '../../core/functions/wait.js';

const restorationInProgress = new Map<string, Promise<void>>();

export const event: BotEvent = {
	name: "channelDelete",
	run: async (client: Client, channel: GuildChannel) => {
		const guildId = channel.guild.id;

		let data = await client.db.get(`${guildId}.PROTECTION`);
		if (!data) return;

		if (!channel.guild.members.me?.permissions.has([
			PermissionFlagsBits.Administrator
		])) return;

		if (data.deletechannel && data.deletechannel.mode === 'allowlist') {
			const fetchedLogs = await channel.guild.fetchAuditLogs({
				type: AuditLogEvent.ChannelDelete,
				limit: 75,
			});
			const relevantLog = fetchedLogs.entries.find(entry =>
				entry.targetId === channel.id &&
				entry.executorId !== client.user?.id &&
				entry.executorId
			);

			if (!relevantLog) return;

			let baseData = await client.db.get(`${guildId}.ALLOWLIST.list.${relevantLog.executorId}`);

			if (!baseData) {
				let user = channel.guild.members.cache.get(relevantLog.executorId!);
				if (!user) return;

				client.func.method.punish(data, user);

				const existingRestoration = restorationInProgress.get(guildId);
				if (existingRestoration) {
					await existingRestoration;
					return;
				}

				const restorationPromise = (async () => {
					try {
						const backup = protectionCache.data.get(guildId);
						if (!backup) return;

						const categoryMap = new Map<string, CategoryChannel>();

						for (const categoryBackup of backup.categories) {
							const existingCategory = channel.guild.channels.cache.get(categoryBackup.id) as CategoryChannel;

							if (existingCategory) {
								categoryMap.set(categoryBackup.id, existingCategory);
							} else {
								try {
									const newCategory = await channel.guild.channels.create({
										name: categoryBackup.name,
										type: ChannelType.GuildCategory,
										position: categoryBackup.position,
										reason: `Category re-created by Protect (${relevantLog.executorId})`
									});
									categoryMap.set(categoryBackup.id, newCategory);
									await wait(300);
								} catch {
								}
							}
						}

						for (const categoryBackup of backup.categories) {
							const category = categoryMap.get(categoryBackup.id);
							if (!category) continue;

							for (const channelBackup of categoryBackup.channels) {
								const existingChannel = channel.guild.channels.cache.get(channelBackup.id);

								if (!existingChannel) {
									try {
										await channel.guild.channels.create({
											name: channelBackup.name,
											type: channelBackup.type as any,
											parent: category.id,
											position: channelBackup.position,
											permissionOverwrites: channelBackup.permissions,
											reason: `Restoration by Protect (${relevantLog.executorId})`
										});
										await wait(300);
									} catch {
									}
								} else if (existingChannel.parentId !== category.id) {
									try {
										await (existingChannel as GuildChannel).setParent(category.id, { lockPermissions: false });
										await (existingChannel as GuildChannel).setPosition(channelBackup.position);
										await wait(300);
									} catch {
									}
								}
							}
						}

					} catch {
					} finally {
						restorationInProgress.delete(guildId);
					}
				})();

				restorationInProgress.set(guildId, restorationPromise);

				await restorationPromise;
			}
		}
	},
};