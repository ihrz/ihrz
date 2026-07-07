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

import { Client, PermissionsBitField, Presence } from "discord.js";

import { BotEvent } from "../../../types/event.js";
import { DatabaseStructure } from "../../../types/database_structure.js";

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
			await client.db.get(`${newPresence.guild.id}.GUILD.SUPPORT`);

		if (!someinfo || !someinfo.rolesId) {
			return;
		}

		const bio = newPresence.activities[0] || "null";
		const vanity = newPresence.guild.vanityURLCode || "null";

		const fetchedUser = newPresence.guild.members.cache.get(
			oldPresence.userId
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

		if (!someinfo.type) someinfo.type === "bio";

		if (someinfo?.type === "bio" && !bio.state) {
			if (fetchedUser?.roles.cache.has(someinfo.rolesId))
				return fetchedUser.roles.remove(
					someinfo.rolesId,
					"[Support] Module"
				);
			return;
		} else if (
			someinfo.type === "tag" &&
			!fetchedUser.user.primaryGuild?.identityGuildId
		) {
			if (fetchedUser?.roles.cache.has(someinfo.rolesId))
				return fetchedUser.roles.remove(
					someinfo.rolesId,
					"[Support] Module"
				);
			return;
		}

		const cleanBio = bio.state?.toString().toLowerCase() || "";
		const cleanInput = someinfo?.input?.toString().toLowerCase() || "";
		const cleanVanity = vanity.toString().toLowerCase();

		if (
			(someinfo.type === "bio" &&
				(cleanBio.includes(cleanInput) ||
					cleanBio.includes(cleanVanity))) ||
			(someinfo.type === "tag" &&
				fetchedUser.user.primaryGuild?.identityGuildId ===
					newPresence.guild.id)
		) {
			return fetchedUser?.roles
				.add(someinfo.rolesId, "[Support] Module")
				.catch(() => {});
		} else {
			return fetchedUser?.roles
				.remove(someinfo.rolesId, "[Support] Module")
				.catch(() => {});
		}
	}
};
