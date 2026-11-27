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

/**
 * The supporter role (`GUILD.SUPPORT`, set by /support and the dashboard):
 * given while a member's custom status holds the keyword (or the server's
 * vanity code) and/or they wear the server tag, removed when they stop.
 *
 * Checked on every presence change (Events/utils/supportModule.ts) and, when
 * the module is set up or changed, for every member online at once: a member
 * whose status already matched would otherwise wait for their next change.
 * An offline or invisible member is left as is (no status to read).
 */
import {
	ActivityType,
	Guild,
	GuildMember,
	PermissionsBitField,
	Presence
} from "discord.js";

import { DatabaseStructure } from "../../../types/database_structure.js";
import logger from "../logger.js";

/** An empty needle would match every status, so it never counts. */
export function bioMatches(
	bio: string | null | undefined,
	input: string | null | undefined,
	vanity: string | null | undefined
): boolean {
	const text = bio?.toLowerCase() ?? "";
	return [input, vanity].some(
		(needle) => !!needle?.trim() && text.includes(needle.toLowerCase())
	);
}

/** Whether a member earns the role, from what the module asks for. */
export function supportQualifies(
	type: DatabaseStructure.SupportType,
	bio: boolean,
	tag: boolean
): boolean {
	switch (type) {
		case "tag":
			return tag;
		case "both":
			return bio && tag;
		case "either":
			return bio || tag;
		default:
			return bio;
	}
}

/** Gives or removes the role for one member, from their current presence. */
export async function applySupportRole(
	guild: Guild,
	member: GuildMember,
	presence: Presence,
	config: DatabaseStructure.SupportSchema
): Promise<void> {
	const me = guild.members.me;
	const role = config.rolesId ? guild.roles.cache.get(config.rolesId) : null;
	if (
		!me?.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
		!role ||
		me.roles.highest.position < role.rawPosition ||
		presence.status === "offline" ||
		presence.status === "invisible"
	) {
		return;
	}

	// The custom status, wherever it is in the list (a game played first
	// used to hide it).
	const status =
		presence.activities.find((a) => a.type === ActivityType.Custom)
			?.state ?? null;
	const bioOk = bioMatches(status, config.input, guild.vanityURLCode);
	const tagOk = member.user.primaryGuild?.identityGuildId === guild.id;
	const hasRole = member.roles.cache.has(role.id);

	if (supportQualifies(config.type ?? "bio", bioOk, tagOk)) {
		if (!hasRole)
			await member.roles.add(role.id, "[Support] Module").catch(() => {});
		return;
	}
	if (hasRole)
		await member.roles.remove(role.id, "[Support] Module").catch(() => {});
}

/** Applies the module to every member online right now (after a setup or a change). */
export async function refreshSupportRoles(
	guild: Guild,
	config: DatabaseStructure.SupportSchema | null
): Promise<void> {
	if (!config?.rolesId) return;
	for (const presence of guild.presences.cache.values()) {
		const member =
			guild.members.cache.get(presence.userId) ??
			(await guild.members.fetch(presence.userId).catch(() => null));
		if (!member || member.user.bot) continue;
		await applySupportRole(guild, member, presence, config).catch(
			(error: unknown) => {
				logger.warn(
					`Support role refresh failed for guild ${guild.id}, user ${member.id}: ${String(error)}`
				);
			}
		);
	}
}
