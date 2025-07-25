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

import { Client, VoiceState, CategoryChannel, ChannelType, GuildChannel } from 'discord.js';

import { BotEvent } from '../../../types/event.js';
import { DatabaseStructure } from '../../../types/database_structure.js';

export const event: BotEvent = {
	name: "voiceStateUpdate",
	run: async (client: Client, oldState: VoiceState, newState: VoiceState) => {

		if (!oldState || !oldState.guild) return;

		// Avoid some troubles
		if (newState.channelId === oldState.channelId) return;

		const table = await client.db.table('TEMP');

		const allChannel = await table.get(`CUSTOM_VOICE.${newState.guild.id}`);

		const baseData = await client.db.get(`${newState.guild.id}.VOICE_INTERFACE`) as DatabaseStructure.VoiceData | null | undefined;

		if (!baseData
			|| !baseData.voice_channel
		) {
			return;
		}

		const ChannelDB = await table.get(`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`);

		const channel_db_fetched = newState.guild.channels.cache.get(ChannelDB) as GuildChannel;
		const result_channel = newState.guild.channels.cache.get(baseData.voice_channel);
		const category_channel = newState.guild.channels.cache.get(result_channel?.parentId as string) as CategoryChannel;

		// If the user leave their own empty channel
		if (oldState.channelId === ChannelDB && channel_db_fetched?.members.size === 0) {
			await channel_db_fetched?.delete().catch(() => { });
			await table.delete(`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`);
			return;
		};

		// If the member leave their own channel for trying to create another one
		if (newState.channelId === baseData.voice_channel && oldState.channelId === ChannelDB) {
			await newState.member?.voice.disconnect();
			return;
		};

		// If the user leave annother empty channel
		if (oldState.channel?.members.size === 0 && allChannel) {
			const allChannelEntries = Object.entries(allChannel);

			for (const [userId, channelId] of allChannelEntries) {
				if (channelId !== oldState.channelId) continue;
				const userChannel = newState.guild.channels.cache.get(channelId as unknown as string);

				if (oldState.channelId === channelId) {
					await userChannel?.delete();
					await table.delete(`CUSTOM_VOICE.${newState.guild.id}.${userId}`);
					return;
				}
			}
		};

		const lang = await client.func.getLanguageData(newState.guild.id);

		// If the user join the Create's Channel
		if (newState.channelId === baseData.voice_channel && oldState.channelId !== ChannelDB) {
			const PotentialCategory = oldState.guild.channels.cache.get(baseData?.voice_channel_category || "") || await oldState.guild.channels.fetch(baseData?.voice_channel_category || "");
			const username = newState.member?.displayName || newState.member?.nickname;

			newState.guild.channels.create({
				name: lang.temporary_voice_channel_name.replace("{nickname}", username!),
				parent: result_channel?.parentId,
				permissionOverwrites: category_channel.permissionOverwrites.cache,
				type: ChannelType.GuildVoice,
			}).then(async chann => {
				await table.set(`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`, chann.id);
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
						if ((await chann.fetch()).members.size === 0) {
							await chann.delete()
							await table.delete(`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`);
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
		const table = await client.db.table('TEMP');
		const allCustomChannels = await table.get(`CUSTOM_VOICE.${guild.id}`);

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
					await table.delete(`CUSTOM_VOICE.${guild.id}.${userId}`);
					continue;
				}

				// Check if channel is a voice channel and is empty
				if (channel.type === ChannelType.GuildVoice && channel.members.size === 0) {
					// Delete the empty custom voice channel
					await channel.delete().catch(() => { });
					// Clean up database entry
					await table.delete(`CUSTOM_VOICE.${guild.id}.${userId}`);
				}
			} catch (error) {
				// If any error occurs, clean up the database entry
				await table.delete(`CUSTOM_VOICE.${guild.id}.${userId}`);
			}
		}
	}
};