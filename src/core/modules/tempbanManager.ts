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

import { Client, Guild, User } from "discord.js";
import { DatabaseStructure } from "../../../types/database_structure";

export class TempbanManager {
	private client: Client;
	private checkInterval: NodeJS.Timeout | null = null;
	private readonly CHECK_INTERVAL_MS = 30000; // Check every 30 seconds

	constructor() {
		this.client = client;
	}

	/**
	 * Add a temporary ban to a user
	 * @param guild The guild to ban the user from
	 * @param user The user to ban
	 * @param time The duration in milliseconds
	 * @param reason The reason for the ban
	 * @returns true if the operation succeeded, false otherwise
	 */
	public async addban(
		guild: Guild,
		user: User,
		time: number,
		reason?: string
	): Promise<boolean> {
		try {
			// Ban the user from the guild
			await guild.members.ban(user, {
				reason: reason || "No reason provided"
			});

			const guildId = guild.id;
			const userId = user.id;
			const expirationTime = Date.now() + time;

			// Get current data
			const dbPath = `${guildId}.GUILD.TEMPBAN`;
			let tempBans: DatabaseStructure.TempbanSchema =
				(await this.client.db.get(dbPath)) || {};

			// Add the new temporary ban
			tempBans[userId] = {
				reason: reason || "No reason provided",
				time: expirationTime
			};

			// Save to database
			await this.client.db.set(dbPath, tempBans);

			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Check if a user is already temporarily banned
	 * @param guild The guild to check
	 * @param user The user to check
	 * @returns true if the user is already temporarily banned, false otherwise
	 */
	public async isAlreadyBanned(guild: Guild, user: User): Promise<boolean> {
		try {
			const guildId = guild.id;
			const userId = user.id;
			const dbPath = `${guildId}.GUILD.TEMPBAN`;

			const tempBans: DatabaseStructure.TempbanSchema =
				(await this.client.db.get(dbPath)) || {};

			return userId in tempBans;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Remove a temporary ban from a user
	 * @param guild The guild to unban the user from
	 * @param userId The user ID to unban
	 * @returns true if the operation succeeded, false otherwise
	 */
	private async removeban(guild: Guild, userId: string): Promise<boolean> {
		try {
			// Unban the user from the guild
			await guild.members.unban(userId);

			const guildId = guild.id;
			const dbPath = `${guildId}.GUILD.TEMPBAN`;

			let tempBans: DatabaseStructure.TempbanSchema =
				(await this.client.db.get(dbPath)) || {};

			// Remove the ban entry
			if (tempBans[userId]) {
				delete tempBans[userId];
				await this.client.db.set(dbPath, tempBans);
			}

			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Check and remove expired temporary bans
	 */
	private async checkExpiredBans(): Promise<void> {
		try {
			const currentTime = Date.now();

			// Loop through all guilds
			for (const guild of this.client.guilds.cache.values()) {
				const dbPath = `${guild.id}.GUILD.TEMPBAN`;
				let tempBans: DatabaseStructure.TempbanSchema =
					(await this.client.db.get(dbPath)) || {};
				let hasChanges = false;

				// Loop through all users with temporary bans
				for (const [userId, banData] of Object.entries(tempBans)) {
					// Check if the ban has expired
					if (banData.time <= currentTime) {
						// Unban the user
						await guild.members.unban(userId).catch(() => {
							// User might already be unbanned or ban doesn't exist
						});

						// Remove from database
						delete tempBans[userId];
						hasChanges = true;
					}
				}

				// Save changes if necessary
				if (hasChanges) {
					await this.client.db.set(dbPath, tempBans);
				}
			}
		} catch (error) {
			throw new Error(`Error checking expired bans: ${error}`);
		}
	}

	/**
	 * Initialize the temporary ban manager
	 * Start the interval for checking expired bans
	 */
	public init(): void {
		if (this.checkInterval) {
			return;
		}

		// Check immediately on startup
		this.checkExpiredBans();

		// Set up the check interval
		this.checkInterval = setInterval(() => {
			this.checkExpiredBans();
		}, this.CHECK_INTERVAL_MS);
	}

	/**
	 * Stop the temporary ban manager
	 * Useful for cleanup when shutting down the bot
	 */
	public destroy(): void {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}
	}
}
