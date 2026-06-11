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

import {
	Client,
	AuditLogEvent,
	GuildChannel,
	TextChannel,
	GuildChannelEditOptions,
	ChannelType,
	VoiceChannel,
	PermissionFlagsBits,
	GuildMember
} from "discord.js";

import { BotEvent } from "../../../types/event.js";
import { getLogs } from "./ready.js";

export const event: BotEvent = {
	name: "channelUpdate",
	run: async (
		client: Client,
		oldChannel: GuildChannel,
		newChannel: GuildChannel
	) => {
		const data = await client.db.get(`${newChannel.guild.id}.PROTECTION`);
		if (!data) return;

		if (
			!oldChannel.guild.members.me?.permissions.has([
				PermissionFlagsBits.Administrator
			])
		)
			return;

		if (data.updatechannel) {
			const relevantLog = await getLogs({
				guild: oldChannel.guild,
				target: newChannel.id,
				actionType: AuditLogEvent.ChannelUpdate,
				type: "PROTECTION"
			});
			if (!relevantLog) return;

			let user: GuildMember | undefined;
			let shouldSanction: boolean = false;

			if (data.updatechannel.mode === "allowlist") {
				const baseData = await client.db.get(
					`${newChannel.guild.id}.ALLOWLIST.list.${relevantLog.executorId}`
				);

				if (!baseData) {
					user =
						newChannel.guild.members.cache.get(
							relevantLog?.executorId as string
						) || undefined;
					shouldSanction = true;
				}
			} else if (data.updatechannel.mode === "nobody") {
				if (relevantLog.executorId !== oldChannel.guild.ownerId) {
					user =
						newChannel.guild.members.cache.get(
							relevantLog?.executorId as string
						) || undefined;
					shouldSanction = true;
				}

				const isOwner = await client.db.get(
					`${user?.guild.id}.OWNER.${user?.id}`
				);

				!isOwner &&
					shouldSanction &&
					(async () => {
						await client.func.method.punish(data, user!);

						const editOptions: GuildChannelEditOptions = {
							name: oldChannel.name,
							permissionOverwrites: [
								...oldChannel.permissionOverwrites.cache.values()
							],
							parent: oldChannel.parent,
							position: oldChannel.position
						};

						if (oldChannel.type === ChannelType.GuildText) {
							editOptions.topic = (
								oldChannel as TextChannel
							).topic;
							editOptions.nsfw = (oldChannel as TextChannel).nsfw;
							editOptions.rateLimitPerUser = (
								oldChannel as TextChannel
							).rateLimitPerUser;
						}

						if (oldChannel.type === ChannelType.GuildVoice) {
							editOptions.bitrate = (
								oldChannel as VoiceChannel
							).bitrate;
							editOptions.userLimit = (
								oldChannel as VoiceChannel
							).userLimit;
							editOptions.rtcRegion = (
								oldChannel as VoiceChannel
							).rtcRegion;
						}

						await newChannel.edit(editOptions);
					})();
			}
		}
	}
};
