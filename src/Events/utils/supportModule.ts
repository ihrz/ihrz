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

import {
	ActivityType,
	Client,
	PermissionsBitField,
	Presence
} from "discord.js";

import { BotEvent } from "../../../types/event.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { getCachedGuildValue } from "../../core/modules/guildConfigCache.js";

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

export const event: BotEvent = {
	name: "presenceUpdate",
	run: async (
		client: Client,
		oldPresence: Presence,
		newPresence: Presence
	) => {
		if (
			!newPresence.guild?.members.me?.permissions.has([
				PermissionsBitField.Flags.ManageRoles
			])
		)
			return;
		if (!newPresence || !newPresence.guild) return;

		const someinfo: DatabaseStructure.SupportSchema | null =
			await getCachedGuildValue(`${newPresence.guild.id}.GUILD.SUPPORT`);

		if (!someinfo || !someinfo.rolesId) {
			return;
		}

		// The custom status, wherever it is in the list (a game played first
		// used to hide it).
		const status =
			newPresence.activities.find((a) => a.type === ActivityType.Custom)
				?.state ?? null;
		const vanity = newPresence.guild.vanityURLCode;

		const fetchedUser = newPresence.guild.members.cache.get(
			newPresence.userId
		);
		const fetchedRoles = newPresence.guild.roles.cache.get(
			someinfo.rolesId
		);

		if (
			!fetchedUser ||
			!fetchedRoles ||
			newPresence.guild.members.me.roles.highest.position <
				fetchedRoles.rawPosition ||
			newPresence.status === "offline" ||
			newPresence.status === "invisible"
		) {
			return;
		}

		const type = someinfo.type ?? "bio";
		const bioOk = bioMatches(status, someinfo.input, vanity);
		const tagOk =
			fetchedUser.user.primaryGuild?.identityGuildId ===
			newPresence.guild.id;
		const hasRole = fetchedUser.roles.cache.has(someinfo.rolesId);

		if (supportQualifies(type, bioOk, tagOk)) {
			if (hasRole) return;
			return fetchedUser.roles
				.add(someinfo.rolesId, "[Support] Module")
				.catch(() => {});
		}
		if (!hasRole) return;
		return fetchedUser.roles
			.remove(someinfo.rolesId, "[Support] Module")
			.catch(() => {});
	}
};
