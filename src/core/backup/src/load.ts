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

import type { BackupData, LoadOptions } from "./types";
import type {
	NewsChannel,
	TextChannel,
	ForumChannel,
	VoiceBasedChannel
} from "discord.js";
import {
	ChannelType,
	Emoji,
	Guild,
	GuildFeature,
	Role,
	VoiceChannel
} from "discord.js";
import { loadCategory, loadChannel } from "./util";

/**
 * Restores the guild configuration
 */
export const loadConfig = (
	guild: Guild,
	backupData: BackupData
): Promise<Guild[]> => {
	const configPromises: Promise<Guild>[] = [];
	if (backupData.name) {
		configPromises.push(guild.setName(backupData.name, "[Backup System]"));
	}
	if (backupData.iconBase64) {
		configPromises.push(
			guild.setIcon(
				Buffer.from(backupData.iconBase64, "base64"),
				"[Backup System]"
			)
		);
	} else if (backupData.iconURL) {
		configPromises.push(
			guild.setIcon(backupData.iconURL, "[Backup System]")
		);
	}
	if (backupData.splashBase64) {
		configPromises.push(
			guild.setSplash(Buffer.from(backupData.splashBase64, "base64"))
		);
	} else if (backupData.splashURL) {
		configPromises.push(
			guild.setSplash(backupData.splashURL, "[Backup System]")
		);
	}
	if (backupData.bannerBase64) {
		configPromises.push(
			guild.setBanner(Buffer.from(backupData.bannerBase64, "base64"))
		);
	} else if (backupData.bannerURL) {
		configPromises.push(
			guild.setBanner(backupData.bannerURL, "[Backup System]")
		);
	}
	if (backupData.verificationLevel) {
		configPromises.push(
			guild.setVerificationLevel(
				backupData.verificationLevel,
				"[Backup System]"
			)
		);
	}
	if (backupData.defaultMessageNotifications) {
		configPromises.push(
			guild.setDefaultMessageNotifications(
				backupData.defaultMessageNotifications,
				"[Backup System]"
			)
		);
	}
	const changeableExplicitLevel = guild.features.includes(
		GuildFeature.Community
	);
	if (backupData.explicitContentFilter && changeableExplicitLevel) {
		configPromises.push(
			guild.setExplicitContentFilter(
				backupData.explicitContentFilter,
				"[Backup System]"
			)
		);
	}
	return Promise.all(configPromises);
};

/**
 * Restore the guild roles
 */
export const loadRoles = (
	guild: Guild,
	backupData: BackupData
): Promise<Role[]> => {
	const rolePromises: Promise<Role>[] = [];
	backupData.roles.forEach((roleData) => {
		if (roleData.isEveryone) {
			rolePromises.push(
				guild.roles.cache.get(guild.id)!.edit({
					name: roleData.name,
					color: roleData.color,
					permissions: BigInt(roleData.permissions),
					mentionable: roleData.mentionable,
					reason: "[Backup System]"
				})
			);
		} else {
			rolePromises.push(
				guild.roles.create({
					name: roleData.name,
					color: roleData.color,
					hoist: roleData.hoist,
					permissions: BigInt(roleData.permissions),
					mentionable: roleData.mentionable,
					reason: "[Backup System]"
				})
			);
		}
	});
	return Promise.all(rolePromises);
};

/**
 * Restore the guild channels
 */
export const loadChannels = (
	guild: Guild,
	backupData: BackupData,
	options: LoadOptions
): Promise<unknown[]> => {
	const loadChannelPromises: Promise<void | unknown>[] = [];

	// Load categories and their child channels
	backupData.channels.categories.forEach((categoryData) => {
		loadChannelPromises.push(
			new Promise((resolve) => {
				loadCategory(categoryData, guild).then((createdCategory) => {
					// Create an array of promises for child channels
					const childPromises: Promise<void | unknown>[] = [];

					categoryData.children.forEach((channelData) => {
						childPromises.push(
							loadChannel(
								channelData,
								guild,
								createdCategory,
								options
							)
						);
					});

					// Wait for all child channels to be loaded before resolving the promise
					Promise.all(childPromises)
						.then(() => {
							resolve(true);
						})
						.catch((err) => {
							resolve(false);
						});
				});
			})
		);
	});

	// Load channels outside of categories
	backupData.channels.others.forEach((channelData) => {
		loadChannelPromises.push(
			loadChannel(channelData, guild, null, options)
		);
	});
	return Promise.all(loadChannelPromises);
};

/**
 * Restore the afk configuration
 */
export const loadAFK = (
	guild: Guild,
	backupData: BackupData
): Promise<Guild[]> => {
	const afkPromises: Promise<Guild>[] = [];
	if (backupData.afk) {
		afkPromises.push(
			guild.setAFKChannel(
				guild.channels.cache.find(
					(ch) =>
						ch.name === backupData.afk?.name &&
						ch.type === ChannelType.GuildVoice
				) as VoiceChannel,
				"[Backup System]"
			)
		);
		afkPromises.push(
			guild.setAFKTimeout(backupData.afk.timeout, "[Backup System]")
		);
	}
	return Promise.all(afkPromises);
};

/**
 * Restore guild emojis
 */
export const loadEmojis = (
	guild: Guild,
	backupData: BackupData
): Promise<Emoji[]> => {
	const emojiPromises: Promise<Emoji>[] = [];
	backupData.emojis.forEach((emoji) => {
		if (emoji.url) {
			emojiPromises.push(
				guild.emojis.create({
					name: emoji.name,
					attachment: emoji.url,
					reason: "[Backup System]"
				})
			);
		} else if (emoji.base64) {
			emojiPromises.push(
				guild.emojis.create({
					name: emoji.name,
					attachment: Buffer.from(emoji.base64, "base64"),
					reason: "[Backup System]"
				})
			);
		}
	});
	return Promise.all(emojiPromises);
};

/**
 * Restore guild bans
 */
export const loadBans = (
	guild: Guild,
	backupData: BackupData
): Promise<string[]> => {
	const banPromises: Promise<string>[] = [];
	backupData.bans.forEach((ban) => {
		banPromises.push(
			guild.members.ban(ban.id, {
				reason: ban.reason || undefined
			}) as Promise<string>
		);
	});
	return Promise.all(banPromises);
};

/**
 * Restore embedChannel configuration
 */
export const loadEmbedChannel = (
	guild: Guild,
	backupData: BackupData
): Promise<Guild[]> => {
	const embedChannelPromises: Promise<Guild>[] = [];
	if (backupData.widget.channel) {
		embedChannelPromises.push(
			guild.setWidgetSettings(
				{
					enabled: backupData.widget.enabled,
					channel: guild.channels.cache.find(
						(ch) => ch.name === backupData.widget.channel
					) as
						| NewsChannel
						| TextChannel
						| ForumChannel
						| VoiceBasedChannel
				},
				"[Backup System]"
			)
		);
	}
	return Promise.all(embedChannelPromises);
};
