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

import { BaseGuildVoiceChannel, CategoryChannel, ChannelType, Client, VoiceState } from 'discord.js';

import { BotEvent } from '../../../types/event.js';
import { DatabaseStructure } from '../../../types/database_structure.js';
import { tempTable } from '../client/ready.js';

export const event: BotEvent = {
	name: "voiceStateUpdate",
	run: async (client: Client, oldState: VoiceState, newState: VoiceState) => {

		if (!oldState || !oldState.guild) return;

		// Avoid some troubles
		if (newState.channelId === oldState.channelId) return;

		const baseData = await client.db.get(`${newState.guild.id}.VOICE_INTERFACE`) as DatabaseStructure.VoiceData | null | undefined;

		if (!baseData
			|| !baseData.voice_channel
		) {
			return;
		}

		const allChannel = await tempTable.get(`CUSTOM_VOICE.${newState.guild.id}`);
		const result_channel = newState.guild.channels.cache.get(baseData.voice_channel)
			|| await newState.guild.channels.fetch(baseData.voice_channel).catch(() => null);
		const categoryChannelId = baseData.voice_channel_category || result_channel?.parentId;
		const category_channel = categoryChannelId
			? await newState.guild.channels.fetch(categoryChannelId).catch(() => null) as CategoryChannel | null
			: null;

		let channelDb = await tempTable.get(`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`) as string | null | undefined;
		let ownedChannel = channelDb
			? await newState.guild.channels.fetch(channelDb).catch(() => null) as BaseGuildVoiceChannel | null
			: null;

		if (ownedChannel && ownedChannel.type !== ChannelType.GuildVoice) {
			ownedChannel = null;
		}

		if (channelDb && !ownedChannel) {
			await tempTable.delete(`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`);
			channelDb = null;
		}

		if (oldState.channelId === channelDb && oldState.channel?.members.size === 0) {
			await oldState.channel.delete().catch(() => { });
			await tempTable.delete(`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`);
			channelDb = null;
			ownedChannel = null;
		}

		if (newState.channelId === baseData.voice_channel && ownedChannel) {
			await newState.member?.voice.setChannel(ownedChannel.id).catch(() => { });
			return;
		}

		// If the user leave annother empty channel
		if (oldState.channel?.members.size === 0 && allChannel) {
			const allChannelEntries = Object.entries(allChannel);

			for (const [userId, channelId] of allChannelEntries) {
				if (channelId !== oldState.channelId) continue;
				if (userId === newState.member?.id) continue;

				const userChannel = newState.guild.channels.cache.get(channelId as string)
					|| await newState.guild.channels.fetch(channelId as string).catch(() => null);

				if (oldState.channelId === channelId) {
					await userChannel?.delete().catch(() => { });
					await tempTable.delete(`CUSTOM_VOICE.${newState.guild.id}.${userId}`);
					break;
				}
			}
		};

		const lang = await client.func.getLanguageData(newState.guild.id);

		// If the user join the Create's Channel
		if (newState.channelId === baseData.voice_channel && result_channel) {
			const PotentialCategory = baseData.voice_channel_category
				? oldState.guild.channels.cache.get(baseData.voice_channel_category)
				|| await oldState.guild.channels.fetch(baseData.voice_channel_category).catch(() => null)
				: null;
			const username = newState.member?.displayName || newState.member?.nickname;

			newState.guild.channels.create({
				name: lang.temporary_voice_channel_name.replace("{nickname}", username!),
				parent: result_channel?.parentId,
				permissionOverwrites: category_channel?.permissionOverwrites.cache,
				type: ChannelType.GuildVoice,
			}).then(async chann => {
				await tempTable.set(`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`, chann.id);
				if (PotentialCategory?.id) {
					chann.setParent(PotentialCategory.id)
				}

				if (baseData?.voice_channel_position === "top") {
					chann.setPosition(0, {
						relative: true
					})
				}

				if (baseData?.voice_channel_name) {
					chann.setName(
						baseData.voice_channel_name.includes("{Username}") ?
							baseData.voice_channel_name.replace("{Username}", username!)
							: baseData.voice_channel_name + " " + username
					)
				}

				newState.member?.voice.setChannel(chann.id)
					.then(async () => {
						const movedMember = await newState.guild.members.fetch(newState.member?.id as string).catch(() => null);

						if (movedMember?.voice.channelId !== chann.id) {
							await chann.delete().catch(() => { });
							await tempTable.delete(`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`);
							return;
						} else {
							chann.permissionOverwrites.edit(newState.member?.user.id as string,
								{
									ViewChannel: true,
									Connect: true,
									Stream: true,
									Speak: true,

									SendMessages: true,
									UseApplicationCommands: true,
									AttachFiles: true,
									AddReactions: true
								},
							);

							if (baseData.staff_role) {
								if (typeof baseData.staff_role === "string") { // backward compatibility
									chann.permissionOverwrites.edit(baseData.staff_role,
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
										},
									);
								} else {
									for (let roleId of baseData.staff_role) {
										if (newState.guild.roles.cache.get(roleId))
											chann.permissionOverwrites.edit(roleId,
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
												},
											);
									}
								}
							}
						}
					})
					.catch(async () => {
						await chann.delete().catch(() => { });
					});
			});
			return;
		};
	},
};

export async function recoverCustomVoiceChannels(client: Client) {
	for (const guild of client.guilds.cache.values()) {
		const allCustomChannels = await tempTable.get(`CUSTOM_VOICE.${guild.id}`);

		// If no custom voice channels exist for this guild, skip
		if (!allCustomChannels) continue;

		const allChannelEntries = Object.entries(allCustomChannels);

		for (const [userId, channelId] of allChannelEntries) {
			try {
				// Fetch the channel from Discord
				const channel = guild.channels.cache.get(channelId as string) ||
					await guild.channels.fetch(channelId as string).catch(() => null);

				// If channel doesn't exist anymore, clean up database
				if (!channel) {
					await tempTable.delete(`CUSTOM_VOICE.${guild.id}.${userId}`);
					continue;
				}

				// Check if channel is a voice channel and is empty
				if (channel.type === ChannelType.GuildVoice && channel.members.size === 0) {
					// Delete the empty custom voice channel
					await channel.delete().catch(() => { });
					// Clean up database entry
					await tempTable.delete(`CUSTOM_VOICE.${guild.id}.${userId}`);
				}
			} catch (error) {
				// If any error occurs, clean up the database entry
				await tempTable.delete(`CUSTOM_VOICE.${guild.id}.${userId}`);
			}
		}
	}
};
