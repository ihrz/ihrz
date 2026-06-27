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
	BaseGuildVoiceChannel,
	CategoryChannel,
	ChannelType,
	Client,
	VoiceBasedChannel,
	VoiceState
} from "discord.js";

import { BotEvent } from "../../../types/event.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { tempTable } from "../client/ready.js";

/**
 * Returns the real member count of a voice channel by fetching it from Discord.
 * With makeCache/sweeper, channel.members may be empty even when people are inside.
 * We re-fetch the channel so Discord.js repopulates the members collection.
 */
async function isMemberlessChannel(
	channel: VoiceBasedChannel | null | undefined
): Promise<boolean> {
	if (!channel || channel.type !== ChannelType.GuildVoice) return false;
	try {
		// Re-fetch forces Discord.js to pull fresh member data from the gateway cache
		// (not an API call — it hits the in-memory guild member store that makeCache
		// may have swept from the channel's own .members collection).
		const fresh = (await channel.fetch()) as BaseGuildVoiceChannel;
		return fresh.members.size === 0;
	} catch {
		// If the channel is already gone, treat it as empty
		return true;
	}
}

export const event: BotEvent = {
	name: "voiceStateUpdate",
	run: async (client: Client, oldState: VoiceState, newState: VoiceState) => {
		if (!oldState || !oldState.guild) return;

		// Avoid some troubles
		if (newState.channelId === oldState.channelId) return;

		const baseData = (await client.db.get(
			`${newState.guild.id}.VOICE_INTERFACE`
		)) as DatabaseStructure.VoiceData | null | undefined;

		if (!baseData || !baseData.voice_channel) {
			return;
		}

		const allChannel = await tempTable.get(
			`CUSTOM_VOICE.${newState.guild.id}`
		);
		const result_channel =
			newState.guild.channels.cache.get(baseData.voice_channel) ||
			(await newState.guild.channels
				.fetch(baseData.voice_channel)
				.catch(() => null));
		const categoryChannelId =
			baseData.voice_channel_category || result_channel?.parentId;
		const category_channel = categoryChannelId
			? ((await newState.guild.channels
					.fetch(categoryChannelId)
					.catch(() => null)) as CategoryChannel | null)
			: null;

		let channelDb = (await tempTable.get(
			`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`
		)) as string | null | undefined;
		let ownedChannel = channelDb
			? ((await newState.guild.channels
					.fetch(channelDb)
					.catch(() => null)) as BaseGuildVoiceChannel | null)
			: null;

		if (ownedChannel && ownedChannel.type !== ChannelType.GuildVoice) {
			ownedChannel = null;
		}

		if (channelDb && !ownedChannel) {
			await tempTable.delete(
				`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`
			);
			channelDb = null;
		}

		if (
			oldState.channelId === channelDb &&
			(await isMemberlessChannel(oldState.channel))
		) {
			await oldState.channel?.delete().catch(() => {});
			await tempTable.delete(
				`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`
			);
			channelDb = null;
			ownedChannel = null;
		}

		if (newState.channelId === baseData.voice_channel && ownedChannel) {
			await newState.member?.voice
				.setChannel(ownedChannel.id)
				.catch(() => {});
			return;
		}

		if (oldState.channel && allChannel) {
			const allChannelEntries = Object.entries(allChannel);

			for (const [userId, channelChannelId] of allChannelEntries) {
				if (channelChannelId !== oldState.channelId) continue;
				if (userId === newState.member?.id) continue;

				const userChannel = (newState.guild.channels.cache.get(
					channelChannelId as string
				) ||
					(await newState.guild.channels
						.fetch(channelChannelId as string)
						.catch(() => null))) as BaseGuildVoiceChannel | null;

				if (
					oldState.channelId === channelChannelId &&
					(await isMemberlessChannel(
						userChannel as VoiceBasedChannel
					))
				) {
					await userChannel?.delete().catch(() => {});
					await tempTable.delete(
						`CUSTOM_VOICE.${newState.guild.id}.${userId}`
					);
					break;
				}
			}
		}

		const lang = await client.func.getLanguageData(newState.guild.id);

		// If the user join the Create's Channel
		if (newState.channelId === baseData.voice_channel && result_channel) {
			const PotentialCategory = baseData.voice_channel_category
				? oldState.guild.channels.cache.get(
						baseData.voice_channel_category
					) ||
					(await oldState.guild.channels
						.fetch(baseData.voice_channel_category)
						.catch(() => null))
				: null;
			const username =
				newState.member?.displayName || newState.member?.nickname;

			newState.guild.channels
				.create({
					name: lang.temporary_voice_channel_name.replace(
						"{nickname}",
						username!
					),
					parent: result_channel?.parentId,
					permissionOverwrites:
						category_channel?.permissionOverwrites.cache,
					type: ChannelType.GuildVoice
				})
				.then(async (chann) => {
					await tempTable.set(
						`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`,
						chann.id
					);
					if (PotentialCategory?.id) {
						chann.setParent(PotentialCategory.id);
					}

					if (baseData?.voice_channel_position === "top") {
						chann.setPosition(0, {
							relative: true
						});
					}

					if (baseData?.voice_channel_name) {
						chann.setName(
							baseData.voice_channel_name.includes("{Username}")
								? baseData.voice_channel_name.replace(
										"{Username}",
										username!
									)
								: baseData.voice_channel_name + " " + username
						);
					}

					newState.member?.voice
						.setChannel(chann.id)
						.then(async () => {
							const movedMember = await newState.guild.members
								.fetch({
									user: newState.member?.id as string,
									force: true
								})
								.catch(() => null);

							if (
								!movedMember ||
								movedMember.voice.channelId !== chann.id
							) {
								await chann.delete().catch(() => {});
								await tempTable.delete(
									`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`
								);
								return;
							}

							// Permissions propriétaire
							chann.permissionOverwrites.edit(
								newState.member?.user.id as string,
								{
									ViewChannel: true,
									Connect: true,
									Stream: true,
									Speak: true,
									SendMessages: true,
									UseApplicationCommands: true,
									AttachFiles: true,
									AddReactions: true
								}
							);

							// Permissions staff
							if (baseData.staff_role) {
								if (typeof baseData.staff_role === "string") {
									// backward compatibility
									chann.permissionOverwrites.edit(
										baseData.staff_role,
										{
											ViewChannel: true,
											Connect: true,
											Stream: true,
											Speak: true,
											SendMessages: true,
											UseApplicationCommands: true,
											AttachFiles: true,
											AddReactions: true,
											MuteMembers: true,
											DeafenMembers: true,
											PrioritySpeaker: true,
											KickMembers: true
										}
									);
								} else {
									for (let roleId of baseData.staff_role) {
										if (
											newState.guild.roles.cache.get(
												roleId
											)
										) {
											chann.permissionOverwrites.edit(
												roleId,
												{
													ViewChannel: true,
													Connect: true,
													Stream: true,
													Speak: true,
													SendMessages: true,
													UseApplicationCommands: true,
													AttachFiles: true,
													AddReactions: true,
													MuteMembers: true,
													DeafenMembers: true,
													PrioritySpeaker: true,
													KickMembers: true
												}
											);
										}
									}
								}
							}
						})
						.catch(async () => {
							await chann.delete().catch(() => {});
						});
				});
			return;
		}
	}
};

export async function recoverCustomVoiceChannels(client: Client) {
	for (const guild of client.guilds.cache.values()) {
		const allCustomChannels = await tempTable.get(
			`CUSTOM_VOICE.${guild.id}`
		);

		// If no custom voice channels exist for this guild, skip
		if (!allCustomChannels) continue;

		const allChannelEntries = Object.entries(allCustomChannels);

		for (const [userId, channelId] of allChannelEntries) {
			try {
				// Fetch the channel from Discord
				const channel = (guild.channels.cache.get(
					channelId as string
				) ||
					(await guild.channels
						.fetch(channelId as string)
						.catch(() => null))) as BaseGuildVoiceChannel | null;

				if (!channel) {
					await tempTable.delete(
						`CUSTOM_VOICE.${guild.id}.${userId}`
					);
					continue;
				}

				if (await isMemberlessChannel(channel as VoiceBasedChannel)) {
					await channel.delete().catch(() => {});
					// Clean up database entry
					await tempTable.delete(
						`CUSTOM_VOICE.${guild.id}.${userId}`
					);
				}
				// If any error occurs, clean up the database entry
			} catch {
				await tempTable.delete(`CUSTOM_VOICE.${guild.id}.${userId}`);
			}
		}
	}
}
