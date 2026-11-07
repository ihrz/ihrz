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

import { Client, Guild, GuildMember, Role } from "discord.js";
import { isDiscordErrorCode } from "./tempbanManager.ts";

const UNKNOWN_MEMBER_CODE = 10007;

export type TempRoleSchema = Record<
	string,
	Array<{ roleId: string; time: number }>
>;

export class TemproleManager {
	private client: Client;
	private checkInterval: NodeJS.Timeout | null = null;
	private isRunning = false;
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

			// Save only this member entry, so the others are left untouched
			const memberPath = `${guildId}.GUILD.TEMPROLE.${memberId}`;
			const memberRoles: TempRoleSchema[string] =
				(await this.client.db.get(memberPath)) || [];

			memberRoles.push({
				roleId: role.id,
				time: expirationTime
			});

			await this.client.db.set(memberPath, memberRoles);

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
			const memberPath = `${guildId}.GUILD.TEMPROLE.${memberId}`;

			const memberRoles: TempRoleSchema[string] | null =
				await this.client.db.get(memberPath);

			if (memberRoles) {
				// Filter to remove the role from the list
				const remaining = memberRoles.filter(
					(tempRole) => tempRole.roleId !== role.id
				);

				// Delete the member entry if they have no more temporary roles
				if (remaining.length === 0) {
					await this.client.db.delete(memberPath);
				} else {
					await this.client.db.set(memberPath, remaining);
				}
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
						`temprole: unable to check the guild ${guild.id}: ${error}`
					);
				}
			}
		} finally {
			this.isRunning = false;
		}
	}

	private async checkGuild(guild: Guild): Promise<void> {
		const dbPath = `${guild.id}.GUILD.TEMPROLE`;
		const tempRoles: TempRoleSchema =
			(await this.client.db.get(dbPath)) || {};

		// Loop through all members with temporary roles
		for (const [memberId, roles] of Object.entries(tempRoles)) {
			const currentTime = Date.now();

			const expiredRoles = roles.filter(
				(tempRole) => tempRole.time <= currentTime
			);

			if (expiredRoles.length === 0) {
				continue;
			}

			let member: GuildMember;

			try {
				member = await guild.members.fetch(memberId);
			} catch (error) {
				if (isDiscordErrorCode(error, UNKNOWN_MEMBER_CODE)) {
					// The member is no longer in the server, clean up the entry
					await this.client.db.delete(`${dbPath}.${memberId}`);
				} else {
					// Transient error: keep the entry and retry on the next pass
					logger.err(
						`temprole: unable to fetch ${memberId} in ${guild.id}: ${error}`
					);
				}
				continue;
			}

			const removedIds = new Set<string>();

			for (const expiredRole of expiredRoles) {
				const role = guild.roles.cache.get(expiredRole.roleId);

				if (role && member.roles.cache.has(role.id)) {
					try {
						await member.roles.remove(role);
					} catch (error) {
						logger.err(
							`temprole: unable to remove ${role.id} from ${memberId} in ${guild.id}: ${error}`
						);
						continue;
					}
				}

				removedIds.add(expiredRole.roleId);
			}

			if (removedIds.size === 0) {
				continue;
			}

			// Read the member entry again: a role may have been added meanwhile
			const memberPath = `${dbPath}.${memberId}`;
			const latest: TempRoleSchema[string] =
				(await this.client.db.get(memberPath)) || [];
			const remainingRoles = latest.filter(
				(tempRole) =>
					!(
						removedIds.has(tempRole.roleId) &&
						tempRole.time <= currentTime
					)
			);

			if (remainingRoles.length === 0) {
				await this.client.db.delete(memberPath);
			} else if (remainingRoles.length !== latest.length) {
				await this.client.db.set(memberPath, remainingRoles);
			}
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
