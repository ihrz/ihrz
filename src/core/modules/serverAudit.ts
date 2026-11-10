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

import { Guild, GuildMember, PermissionFlagsBits, Role } from "discord.js";

// What the server audit commands (/util admin-roles, /utils admin-users,
// /utils allbots) and the dashboard list.

/** Roles granting Administrator, highest first. */
export function adminRoles(guild: Guild): Role[] {
	return Array.from(
		guild.roles.cache
			.filter((x) => x.permissions.has(PermissionFlagsBits.Administrator))
			.values()
	).sort((a, b) => b.position - a.position);
}

/** Members with Administrator, without the owner and this bot. */
export function adminMembers(guild: Guild): GuildMember[] {
	return Array.from(
		guild.members.cache
			.filter((x) => x.permissions.has(PermissionFlagsBits.Administrator))
			.filter((x) => x.user.id !== x.guild.ownerId)
			.filter((x) => x.user.id !== x.client.user.id)
			.values()
	);
}

/** Bots of the server, oldest arrival first. */
export function guildBots(guild: Guild): GuildMember[] {
	return [...guild.members.cache.filter((m) => m.user.bot).values()].sort(
		(a, b) => (a.joinedTimestamp ?? 0) - (b.joinedTimestamp ?? 0)
	);
}
