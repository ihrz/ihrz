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

import { Client, GuildMember, Role } from "discord.js";

export type TempRoleSchema = Record<
	string,
	Array<{ roleId: string; time: number }>
>;

export class TemproleManager {
	private client: Client;
	private checkInterval: NodeJS.Timeout | null = null;
	private readonly CHECK_INTERVAL_MS = 30000; // Check every 30 seconds

	constructor() {
		this.client = client;
	}

	/**
	 * Add a temporary role to a member
	 * @param member The member to add the role to
	 * @param role The role to add
	 * @param time The duration in milliseconds
	 * @returns true if the operation succeeded, false otherwise
	 */
	public async addrole(
		member: GuildMember,
		role: Role,
		time: number,
		reason?: string
	): Promise<boolean> {
		try {
			// Add the role to the member
			await member.roles.add(role, reason);

			const guildId = member.guild.id;
			const memberId = member.id;
			const expirationTime = Date.now() + time;

			// Get current data
			const dbPath = `${guildId}.GUILD.TEMPROLE`;
			let tempRoles: TempRoleSchema =
				(await this.client.db.get(dbPath)) || {};

			// Initialize array for this member if necessary
			if (!tempRoles[memberId]) {
				tempRoles[memberId] = [];
			}

			// Add the new temporary role
			tempRoles[memberId].push({
				roleId: role.id,
				time: expirationTime
			});

			// Save to database
			await this.client.db.set(dbPath, tempRoles);

			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Check if a member already has a specific temporary role
	 * @param member The member to check
	 * @param role The role to check
	 * @returns true if the member already has this temporary role, false otherwise
	 */
	public async isAlreadyWithThisRole(
		member: GuildMember,
		role: Role
	): Promise<boolean> {
		try {
			const guildId = member.guild.id;
			const memberId = member.id;
			const dbPath = `${guildId}.GUILD.TEMPROLE`;

			const tempRoles: TempRoleSchema =
				(await this.client.db.get(dbPath)) || {};

			if (!tempRoles[memberId]) {
				return false;
			}

			// Check if the role exists in the member's temporary roles list
			return tempRoles[memberId].some(
				(tempRole) => tempRole.roleId === role.id
			);
		} catch (error) {
			return false;
		}
	}

	/**
	 * Remove a temporary role from a member
	 * @param member The member to remove the role from
	 * @param role The role to remove
	 * @returns true if the operation succeeded, false otherwise
	 */
	private async removerole(
		member: GuildMember,
		role: Role
	): Promise<boolean> {
		try {
			// Remove the role from the member
			await member.roles.remove(role);

			const guildId = member.guild.id;
			const memberId = member.id;
			const dbPath = `${guildId}.GUILD.TEMPROLE`;

			let tempRoles: TempRoleSchema =
				(await this.client.db.get(dbPath)) || {};

			if (tempRoles[memberId]) {
				// Filter to remove the role from the list
				tempRoles[memberId] = tempRoles[memberId].filter(
					(tempRole) => tempRole.roleId !== role.id
				);

				// Delete the member entry if they have no more temporary roles
				if (tempRoles[memberId].length === 0) {
					delete tempRoles[memberId];
				}

				// Save to database
				await this.client.db.set(dbPath, tempRoles);
			}

			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Check and remove expired temporary roles
	 */
	private async checkExpiredRoles(): Promise<void> {
		try {
			const currentTime = Date.now();

			// Loop through all guilds
			for (const guild of this.client.guilds.cache.values()) {
				const dbPath = `${guild.id}.GUILD.TEMPROLE`;
				let tempRoles: TempRoleSchema =
					(await this.client.db.get(dbPath)) || {};
				let hasChanges = false;

				// Loop through all members with temporary roles
				for (const [memberId, roles] of Object.entries(tempRoles)) {
					const member = await guild.members
						.fetch(memberId)
						.catch(() => null);

					if (!member) {
						// The member is no longer in the server, clean up the entry
						delete tempRoles[memberId];
						hasChanges = true;
						continue;
					}

					// Filter expired roles
					const expiredRoles = roles.filter(
						(tempRole) => tempRole.time <= currentTime
					);
					const remainingRoles = roles.filter(
						(tempRole) => tempRole.time > currentTime
					);

					// Remove expired roles
					for (const expiredRole of expiredRoles) {
						const role = guild.roles.cache.get(expiredRole.roleId);
						if (role && member.roles.cache.has(role.id)) {
							await member.roles.remove(role).catch((err) => {});
						}
					}

					// Update the roles list
					if (remainingRoles.length === 0) {
						delete tempRoles[memberId];
						hasChanges = true;
					} else if (remainingRoles.length !== roles.length) {
						tempRoles[memberId] = remainingRoles;
						hasChanges = true;
					}
				}

				// Save changes if necessary
				if (hasChanges) {
					await this.client.db.set(dbPath, tempRoles);
				}
			}
		} catch (error) {
			throw new Error(error);
		}
	}

	/**
	 * Initialize the temporary role manager
	 * Start the interval for checking expired roles
	 */
	public init(): void {
		if (this.checkInterval) {
			return;
		}

		// Check immediately on startup
		this.checkExpiredRoles();

		// Set up the check interval
		this.checkInterval = setInterval(() => {
			this.checkExpiredRoles();
		}, this.CHECK_INTERVAL_MS);
	}

	/**
	 * Stop the temporary role manager
	 * Useful for cleanup when shutting down the bot
	 */
	public destroy(): void {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}
	}
}
