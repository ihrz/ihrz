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

import { Client, AuditLogEvent, Role, Channel, GuildChannel, TextChannel, GuildChannelEditOptions, ChannelType, VoiceChannel, PermissionFlagsBits } from 'discord.js'

import { BotEvent } from '../../../types/event.js';

export const event: BotEvent = {
	name: "channelUpdate",
	run: async (client: Client, oldChannel: GuildChannel, newChannel: GuildChannel) => {

		let data = await client.db.get(`${newChannel.guild.id}.PROTECTION`);
		if (!data) return;

		if (!oldChannel.guild.members.me?.permissions.has([
			PermissionFlagsBits.Administrator
		])) return;

		if (data.updatechannel && data.updatechannel.mode === 'allowlist') {
			let fetchedLogs = await oldChannel.guild.fetchAuditLogs({
				type: AuditLogEvent.ChannelUpdate,
				limit: 75,
			});

			let relevantLog = fetchedLogs.entries.find(entry =>
				entry.targetId === newChannel.id &&
				entry.executorId !== client.user?.id &&
				entry.executorId
			);

			if (!relevantLog) {
				return;
			}

			let baseData = await client.db.get(`${newChannel.guild.id}.ALLOWLIST.list.${relevantLog.executorId}`);

			if (!baseData) {
				let member = newChannel.guild.members.cache.get(relevantLog?.executorId as string);
				await client.func.method.punish(data, member);

				const editOptions: GuildChannelEditOptions = {
					name: oldChannel.name,
					permissionOverwrites: [...oldChannel.permissionOverwrites.cache.values()],
					parent: oldChannel.parent,
					position: oldChannel.position
				};

				if (oldChannel.type === ChannelType.GuildText) {
					editOptions.topic = (oldChannel as TextChannel).topic;
					editOptions.nsfw = (oldChannel as TextChannel).nsfw;
					editOptions.rateLimitPerUser = (oldChannel as TextChannel).rateLimitPerUser;
				}

				if (oldChannel.type === ChannelType.GuildVoice) {
					editOptions.bitrate = (oldChannel as VoiceChannel).bitrate;
					editOptions.userLimit = (oldChannel as VoiceChannel).userLimit;
					editOptions.rtcRegion = (oldChannel as VoiceChannel).rtcRegion;
				}

				await newChannel.edit(editOptions);
			};
		}
	},
};