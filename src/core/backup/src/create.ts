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

import type {
	BanData,
	CategoryData,
	ChannelsData,
	CreateOptions,
	EmojiData,
	RoleData,
	TextChannelData,
	VoiceChannelData
} from "./types";
import {
	fetchChannelPermissions,
	fetchTextChannelData,
	fetchVoiceChannelData,
	fetchStageChannelData
} from "./util";
import { MemberData } from "./types/MemberData";
import {
	CategoryChannel,
	type Guild,
	StageChannel,
	TextChannel,
	ChannelType,
	VoiceChannel
} from "discord.js";

export async function getBans(guild: Guild): Promise<BanData[]> {
	const bans: BanData[] = [];
	try {
		const cases = await guild.bans.fetch(); // Gets the list of the banned members
		cases.forEach((ban) => {
			bans.push({
				id: ban.user.id, // Banned member ID
				reason: ban.reason // Ban reason
			});
		});
	} catch (error) {
		// If the bot doesn't have the permission to see the bans
		// It will throw an error, so we catch it and return an empty array
		return [];
	}

	return bans;
}

export async function getMembers(guild: Guild): Promise<MemberData[]> {
	const members: MemberData[] = [];
	try {
		guild.members.cache.forEach((member) => {
			try {
				members.push({
					userId: member.user.id,
					username: member.user.username,
					discriminator: member.user.discriminator,
					avatarUrl: member.user.avatarURL(),
					joinedTimestamp: member.joinedTimestamp,
					roles: member.roles?.cache?.map((role) => role.id) || [],
					bot: member.user.bot
				});
			} catch (error) {
				// If an error occurs for a specific member, continue with others
				console.error(
					`Error while retrieving member ${member?.user?.id || "unknown"}: ${error}`
				);
			}
		});
	} catch (error) {
		// If an error occurs while retrieving members, return an empty array
		console.error(`Error while retrieving members: ${error}`);
	}
	return members;
}

export async function getRoles(guild: Guild): Promise<RoleData[]> {
	const roles: RoleData[] = [];
	try {
		guild.roles.cache
			.filter((role) => !role.managed)
			.sort((a, b) => b.position - a.position)
			.forEach((role) => {
				try {
					const roleData = {
						name: role.name,
						color: role.hexColor,
						hoist: role.hoist,
						permissions:
							role.permissions?.bitfield?.toString() || "0",
						mentionable: role.mentionable,
						position: role.position,
						isEveryone: guild.id === role.id
					};
					roles.push(roleData);
				} catch (error) {
					// If an error occurs for a specific role, continue with others
					console.error(
						`Error while retrieving role ${role?.id || "unknown"}: ${error}`
					);
				}
			});
	} catch (error) {
		// If an error occurs while retrieving roles, return an empty array
		console.error(`Error while retrieving roles: ${error}`);
	}
	return roles;
}

export async function getEmojis(
	guild: Guild,
	options: CreateOptions
): Promise<EmojiData[]> {
	const emojis: EmojiData[] = [];
	try {
		const promises: Promise<void>[] = [];

		guild.emojis.cache.forEach((emoji) => {
			const promise = (async () => {
				try {
					const eData: EmojiData = {
						name: emoji.name
					};

					if (options.saveImages) {
						try {
							const response = await (
								await fetch(emoji.imageURL({ size: 4096 }))
							).arrayBuffer();
							eData.base64 =
								Buffer.from(response).toString("base64");
						} catch (fetchError) {
							// If the image cannot be retrieved, use the URL instead
							console.error(
								`Error while retrieving emoji image ${emoji.name}: ${fetchError}`
							);
							eData.url = emoji.imageURL({ size: 4096 });
						}
					} else {
						eData.url = emoji.imageURL({ size: 4096 });
					}

					emojis.push(eData);
				} catch (emojiError) {
					// If an error occurs for a specific emoji, continue with others
					console.error(
						`Error while retrieving emoji ${emoji?.name || "unknown"}: ${emojiError}`
					);
				}
			})();

			promises.push(promise);
		});

		// Wait for all promises to be resolved
		await Promise.all(promises);
	} catch (error) {
		// If an error occurs while retrieving emojis, return an empty array
		console.error(`Error while retrieving emojis: ${error}`);
	}

	return emojis;
}

export async function getChannels(
	guild: Guild,
	options: CreateOptions
): Promise<ChannelsData> {
	return new Promise<ChannelsData>(async (resolve) => {
		const channels: ChannelsData = {
			categories: [],
			others: []
		};

		const categories = guild.channels.cache
			.filter((ch) => ch.type === ChannelType.GuildCategory)
			.sort((a, b) =>
				"position" in a && "position" in b ? a.position - b.position : 0
			)
			.map((category) => category) as CategoryChannel[];

		for (const category of categories) {
			// Explicit typing to avoid errors
			const typedCategory = category;
			const categoryData: CategoryData = {
				name: typedCategory.name,
				permissions: fetchChannelPermissions(typedCategory),
				children: []
			};

			// Retrieve child channels in a way compatible with both versions
			let children: any[] = [];
			try {
				// discord.js v14
				if (typedCategory.children && typedCategory.children.cache) {
					children = Array.from(
						typedCategory.children.cache.values()
					);
				}
				// Sort channels by position
				children = children.sort((a, b) => {
					if (
						!a ||
						!b ||
						typeof a.position !== "number" ||
						typeof b.position !== "number"
					)
						return 0;
					return a.position - b.position;
				});
			} catch (error) {
				children = [];
			}
			for (const child of children) {
				// Explicit typing to avoid errors
				const typedChild = child;

				if (
					typedChild.type === ChannelType.GuildText ||
					typedChild.type === ChannelType.GuildAnnouncement ||
					typedChild.type === ChannelType.GuildForum ||
					typedChild.type === ChannelType.GuildMedia
				) {
					if (
						guild.rulesChannelId === typedChild.id ||
						guild.safetyAlertsChannelId === typedChild.id ||
						guild.widgetChannelId === typedChild.id ||
						guild.publicUpdatesChannelId === typedChild.id
					)
						continue;

					const channelData: TextChannelData =
						await fetchTextChannelData(
							typedChild as TextChannel,
							options
						);
					categoryData.children.push(channelData);
				} else if (
					typedChild.type === ChannelType.GuildStageVoice ||
					typedChild.type === "GUILD_STAGE_VOICE"
				) {
					const channelData: VoiceChannelData =
						await fetchStageChannelData(typedChild as StageChannel);
					channelData.userLimit = 0;
					categoryData.children.push(channelData);
				} else {
					const channelData: VoiceChannelData =
						await fetchVoiceChannelData(typedChild as VoiceChannel);
					categoryData.children.push(channelData);
				}
			}
			channels.categories.push(categoryData);
		}

		const others = guild.channels.cache
			.filter((ch) => {
				return (
					!ch.parent &&
					ch.type !== ChannelType.GuildCategory &&
					ch.type !== ChannelType.AnnouncementThread &&
					ch.type !== ChannelType.PrivateThread &&
					ch.type !== ChannelType.PublicThread
				);
			})
			.sort((a, b) => {
				if (!("position" in a) || !("position" in b)) return 0;
				return a.position - b.position;
			})
			.map((channel) => channel);

		for (const channel of others) {
			// Explicit typing to avoid errors
			const typedChannel = channel;
			if (
				typedChannel.type === ChannelType.GuildText ||
				typedChannel.type === ChannelType.GuildAnnouncement ||
				typedChannel.type === ChannelType.GuildForum ||
				typedChannel.type === ChannelType.GuildMedia
			) {
				if (
					guild.rulesChannelId === typedChannel.id ||
					guild.safetyAlertsChannelId === typedChannel.id ||
					guild.widgetChannelId === typedChannel.id ||
					guild.publicUpdatesChannelId === typedChannel.id
				)
					continue;

				const channelData: TextChannelData = await fetchTextChannelData(
					typedChannel as TextChannel,
					options
				);
				channels.others.push(channelData);
			} else if (typedChannel.type === ChannelType.GuildStageVoice) {
				const channelData: VoiceChannelData =
					await fetchStageChannelData(typedChannel as StageChannel);
				channelData.userLimit = 0;
				channels.others.push(channelData);
			} else {
				const channelData: VoiceChannelData =
					await fetchVoiceChannelData(typedChannel as VoiceChannel);
				channels.others.push(channelData);
			}
		}
		resolve(channels);
	});
}
