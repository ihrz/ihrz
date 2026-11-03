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

/* I was too lazy, i have bit used Claude AI (LLM Model) for this file
- Anaïs Saraiva
*/

import { Client, GuildMember } from "discord.js";
import { BotEvent } from "../../../types/event.js";
import { DatabaseStructure } from "../../../types/database_structure.js";

const COUNTER_REGEX = /\s*\[\d+\/\d+\]\s*$/;

export const event: BotEvent = {
	name: "guildMemberUpdate",
	run: async (
		client: Client,
		oldMember: GuildMember,
		newMember: GuildMember
	) => {
		if (oldMember.roles.cache.equals(newMember.roles.cache)) return;

		// Config first: most guilds have no limit, and the role diff below
		// replaces the REST audit log fetch done on every role change.
		const roleLimits = (await client.db.get(
			`${newMember.guild.id}.GUILD.UTILS.ROLE_LIMIT`
		)) as DatabaseStructure.RoleLimitSchema | null;
		if (!roleLimits) return;

		const addedRoleIds = newMember.roles.cache
			.filter((role) => !oldMember.roles.cache.has(role.id))
			.map((role) => role.id);
		const removedRoleIds = oldMember.roles.cache
			.filter((role) => !newMember.roles.cache.has(role.id))
			.map((role) => role.id);

		const affectedRoleIds = [...addedRoleIds, ...removedRoleIds].filter(
			(id) => roleLimits[id]
		);
		if (affectedRoleIds.length === 0) return;

		for (const roleId of affectedRoleIds) {
			const limit = roleLimits[roleId];
			const role = newMember.guild.roles.cache.get(roleId);
			if (!role) continue;

			let holders = role.members.size;

			// Over the limit: take the role back before updating the counter.
			if (addedRoleIds.includes(roleId) && holders > limit) {
				const removed = await newMember.roles
					.remove(
						roleId,
						"[RoleLimit] - The limit of users is reached!"
					)
					.then(() => true)
					.catch(() => false);
				if (removed) holders--;
			}

			const newRoleName = `${role.name.replace(COUNTER_REGEX, "").trim()} [${holders}/${limit}]`;
			if (newRoleName === role.name) continue;

			await role
				.setName(newRoleName, "[RoleLimit] - Updating role counter")
				.catch((error: unknown) =>
					logger.warn(
						`[RoleLimit] Failed to update role name: ${String(error)}`
					)
				);
		}
	}
};
