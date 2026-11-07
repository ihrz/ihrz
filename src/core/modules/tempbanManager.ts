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

const UNKNOWN_BAN_CODE = 10026;

/**
 * Check if an error is a Discord API error with the given code
 */
export function isDiscordErrorCode(error: unknown, code: number): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		(error as { code?: unknown }).code === code
	);
}

export class TempbanManager {
	private client: Client;
	private checkInterval: NodeJS.Timeout | null = null;
	private isRunning = false;
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

			// Save only this entry, so the other bans are left untouched
			await this.client.db.set(`${guildId}.GUILD.TEMPBAN.${userId}`, {
				reason: reason || "No reason provided",
				time: expirationTime
			});

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

			// Remove only this ban entry
			await this.client.db.delete(`${guildId}.GUILD.TEMPBAN.${userId}`);

			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Check and remove expired temporary bans
	 */
	private async checkExpiredBans(): Promise<void> {
		if (this.isRunning) {
			return;
		}

		this.isRunning = true;

		try {
			// Loop through all guilds
			for (const guild of this.client.guilds.cache.values()) {
				try {
					await this.checkGuild(guild);
				} catch (error) {
					logger.err(
						`tempban: unable to check the guild ${guild.id}: ${error}`
					);
				}
			}
		} finally {
			this.isRunning = false;
		}
	}

	private async checkGuild(guild: Guild): Promise<void> {
		const dbPath = `${guild.id}.GUILD.TEMPBAN`;
		const tempBans: DatabaseStructure.TempbanSchema =
			(await this.client.db.get(dbPath)) || {};

		// Loop through all users with temporary bans
		for (const [userId, banData] of Object.entries(tempBans)) {
			// Check if the ban has expired
			if (banData.time > Date.now()) {
				continue;
			}

			try {
				await guild.members.unban(userId);
			} catch (error) {
				// Unknown Ban (10026): the user is already unbanned
				if (!isDiscordErrorCode(error, UNKNOWN_BAN_CODE)) {
					logger.err(
						`tempban: unable to unban ${userId} in ${guild.id}: ${error}`
					);
					continue;
				}
			}

			// Remove only this entry, so a ban added meanwhile is kept
			await this.client.db.delete(`${dbPath}.${userId}`);
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
