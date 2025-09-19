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

import type { BackupData, BackupInfos, CreateOptions, LoadOptions } from './types/';
import type { Guild } from 'discord.js';
import { SnowflakeUtil, IntentsBitField } from 'discord.js';

import { sep } from 'path';

import { existsSync, mkdirSync, statSync, unlinkSync } from 'fs';
import { writeFile, readdir } from 'fs/promises';

import * as createMaster from './create';
import * as loadMaster from './load';
import * as utilMaster from './util';
import { backups_folder } from '../../core.ts';

/**
 * Checks if a backup exists and returns its data
 */
const getBackupData = async (backupID: string) => {
	return new Promise<BackupData>(async (resolve, reject) => {
		const files = await readdir(backups_folder); // Read "backups" directory
		// Try to get the json file
		const file = files.filter((f) => f.split('.').pop() === 'json').find((f) => f === `${backupID}.json`);
		if (file) {
			// If the file exists
			const backupData: BackupData = require(`${backups_folder}${sep}${file}`);
			// Returns backup informations
			resolve(backupData);
		} else {
			// If no backup was found, return an error message
			reject('function:getBackupData : No backup found');
		}
	});
};

/**
 * Fetches a backup and returns the information about it
 */
export const fetchBackup = (backupID: string) => {
	return new Promise<BackupInfos>(async (resolve, reject) => {
		getBackupData(backupID)
			.then((backupData) => {
				const size = statSync(`${backups_folder}${sep}${backupID}.json`).size; // Gets the size of the file using fs
				const backupInfos: BackupInfos = {
					data: backupData,
					id: backupID,
					size: Number((size / 1024).toFixed(2))
				};
				// Returns backup informations
				resolve(backupInfos);
			})
			.catch(() => {
				reject('function: fetch: No backup found');
			});
	});
};

/**
 * Creates a new backup and saves it to the storage
 */
export const create = async (
	guild: Guild,
	options: CreateOptions = {
		backupID: null,
		maxMessagesPerChannel: 10,
		jsonSave: true,
		jsonBeautify: true,
		doNotBackup: [],
		backupMembers: false,
		saveImages: true,
	}
) => {
	return new Promise<BackupData>(async (resolve, reject) => {
		// Initialize backup data with default values
		const backupData: BackupData = {
			name: 'Unknown Server',
			verificationLevel: 0,
			explicitContentFilter: 0,
			defaultMessageNotifications: 0,
			afk: null,
			widget: {
				enabled: false,
				channel: null
			},
			channels: { categories: [], others: [] },
			roles: [],
			bans: [],
			emojis: [],
			members: [],
			createdTimestamp: Date.now(),
			guildID: '',
			id: options.backupID ?? SnowflakeUtil.generate().toString()
		};

		// Retrieve basic server information
		try {
			backupData.name = guild.name || 'Unknown Server';
			backupData.verificationLevel = guild.verificationLevel;
			backupData.explicitContentFilter = guild.explicitContentFilter;
			backupData.defaultMessageNotifications = guild.defaultMessageNotifications;
			backupData.guildID = guild.id;

			// Retrieve AFK information
			if (guild.afkChannel) {
				backupData.afk = {
					name: guild.afkChannel.name,
					timeout: guild.afkTimeout
				};
			}

			// Retrieve widget information
			try {
				backupData.widget = {
					enabled: guild.widgetEnabled || false,
					channel: guild.widgetChannel ? guild.widgetChannel.name : null
				};
			} catch (widgetError) {
				console.error(`Error while retrieving widget information: ${widgetError}`);
				// Continue with default values
			}
		} catch (basicInfoError) {
			console.error(`Error while retrieving basic server information: ${basicInfoError}`);
			// Continue with default values
		}

		// Retrieve server images
		try {
			if (guild.icon) {
				backupData.iconURL = guild.icon;

				if (options && options.saveImages) {
					try {
						let icon_url: string | null = guild.icon
						if ('iconURL' in guild) {
							icon_url = guild.iconURL();
						}

						if (icon_url) {
							const iconResponse = await fetch(icon_url);
							const iconBuffer = await iconResponse.arrayBuffer();
							backupData.iconBase64 = Buffer.from(iconBuffer).toString('base64')
						}
					} catch (iconError) {
						console.error(`Error while retrieving server icon: ${iconError}`);
					}
				}
			}

			if (guild.splash) {
				backupData.splashURL = guild.splash;
				if (options && options.saveImages) {
					try {
						let splash_url: string | null = guild.splash;
						if ('splashURL' in guild) {
							splash_url = guild.splashURL({ size: 4096, extension: "webp" })
						}

						if (splash_url) {
							const splashResponse = await fetch(splash_url);
							const splashBuffer = await splashResponse.arrayBuffer();
							backupData.splashBase64 = Buffer.from(splashBuffer).toString("base64")
						}
					} catch (splashError) {
						console.error(`Error while retrieving server splash: ${splashError}`);
					}
				}
			}

			if (guild.banner) {
				backupData.bannerURL = guild.banner;
				if (options && options.saveImages) {
					try {
						let banner_url: string | null = guild.banner;
						if ('bannerURL' in guild) {
							banner_url = guild.bannerURL({ size: 4096, extension: "webp", forceStatic: false })
						}

						if (banner_url) {
							const bannerResponse = await fetch(banner_url);
							const bannerBuffer = await bannerResponse.arrayBuffer()
							backupData.bannerBase64 = Buffer.from(bannerBuffer).toString("base64")
						}
					} catch (bannerError) {
						console.error(`Error while retrieving server banner: ${bannerError}`);
					}
				}
			}
		} catch (imageError) {
			console.error(`Error while retrieving server images: ${imageError}`);
			// Continue without images
		}

		// Backup members if requested
		if (options && options.backupMembers) {
			try {
				backupData.members = await createMaster.getMembers(guild);
			} catch (membersError) {
				console.error(`Error while retrieving members: ${membersError}`);
				// Continue with empty array
			}
		}

		// Backup bans if not excluded
		if (!options || !(options.doNotBackup || []).includes('bans')) {
			try {
				backupData.bans = await createMaster.getBans(guild);
			} catch (bansError) {
				console.error(`Error while retrieving bans: ${bansError}`);
				// Continue with empty array
			}
		}

		// Backup roles if not excluded
		if (!options || !(options.doNotBackup || []).includes('roles')) {
			try {
				backupData.roles = await createMaster.getRoles(guild);
			} catch (rolesError) {
				console.error(`Error while retrieving roles: ${rolesError}`);
				// Continue with empty array
			}
		}

		// Backup emojis if not excluded
		if (!options || !(options.doNotBackup || []).includes('emojis')) {
			try {
				backupData.emojis = await createMaster.getEmojis(guild, options);
			} catch (emojisError) {
				console.error(`Error while retrieving emojis: ${emojisError}`);
				// Continue with empty array
			}
		}

		// Backup channels if not excluded
		if (!options || !(options.doNotBackup || []).includes('channels')) {
			try {
				backupData.channels = await createMaster.getChannels(guild, options);
			} catch (channelsError) {
				console.error(`Error while retrieving channels: ${channelsError}`);
				// Continue with empty arrays
			}
		}

		// Save backup to JSON if requested
		if (!options || options.jsonSave === undefined || options.jsonSave) {
			try {
				// Convert Object to JSON
				const backupJSON = options.jsonBeautify
					? JSON.stringify(backupData, null, 4)
					: JSON.stringify(backupData);
				// Save the backup
				await writeFile(`${backups_folder}${sep}${backupData.id}.json`, backupJSON, 'utf-8');
			} catch (saveError) {
				console.error(`Error while saving backup: ${saveError}`);
				// Continue and return data anyway
			}
		}

		// Return data even if some parts failed
		resolve(backupData);
	});
};

/**
 * Loads a backup for a guild
 */
export const load = async (
	backup: string | BackupData,
	guild: Guild,
	options: LoadOptions = {
		clearGuildBeforeRestore: true,
		maxMessagesPerChannel: 100, // Increased default value to 100 messages
	}
) => {
	return new Promise(async (resolve, reject) => {

		if (!guild) {
			return reject('Invalid guild');
		}
		try {
			const backupData: BackupData = typeof backup === 'string' ? await getBackupData(backup) : backup;
			try {
				if (options.clearGuildBeforeRestore === undefined || options.clearGuildBeforeRestore) {
					// Clear the guild
					await utilMaster.clearGuild(guild);
				}
				await Promise.all([
					// Restore guild configuration
					loadMaster.loadConfig(guild, backupData),
					// Restore guild roles
					loadMaster.loadRoles(guild, backupData),
					// Restore guild channels
					loadMaster.loadChannels(guild, backupData, options),
					// Restore afk channel and timeout
					loadMaster.loadAFK(guild, backupData),
					// Restore guild emojis
					loadMaster.loadEmojis(guild, backupData),
					// Restore guild bans
					loadMaster.loadBans(guild, backupData),
					// Restore embed channel
					loadMaster.loadEmbedChannel(guild, backupData)
				]);
			} catch (e) {
				return reject(e);
			}
			// Then return the backup data
			return resolve(backupData);
		} catch (e) {
			return reject('function:load:No backup found');
		}
	});
};

/**
 * Removes a backup
 */
export const remove = async (backupID: string) => {
	return new Promise<void>((resolve, reject) => {
		try {
			require(`${backups_folder}${sep}${backupID}.json`);
			unlinkSync(`${backups_folder}${sep}${backupID}.json`);
			resolve();
		} catch (error) {
			reject('Backup not found');
		}
	});
};

/**
 * Returns the list of all backup
 */
export const list = async () => {
	const files = await readdir(backups_folder); // Read "backups" directory
	return files.map((f) => f.split('.')[0]);
};