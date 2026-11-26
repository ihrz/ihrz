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

import { Client, GuildMember, PermissionsBitField } from "discord.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { WelcomeContext } from "../../core/modules/memberArrival.js";

/**
 * Join roles the bot can still hand out. One deleted, managed or too high
 * role (moved after it was saved) made Discord refuse the whole request, and
 * the member got none of them.
 */
export function joinRolesToGive(member: GuildMember, ids: string[]): string[] {
	const ceiling = member.guild.members.me?.roles.highest.position ?? 0;
	return ids.filter((id) => {
		const role = member.guild.roles.cache.get(id);
		return !!role && !role.managed && role.position < ceiling;
	});
}

/** Join roles, part of the welcome side (after the captcha when it is on). */
export async function giveJoinRoles(
	client: Client,
	member: GuildMember,
	ctx: WelcomeContext = {}
): Promise<void> {
	try {
		if (
			!member.guild.members.me?.permissions.has(
				PermissionsBitField.Flags.ManageRoles
			)
		)
			return;

		const roleid = (await client.db.get(
			`${member.guild.id}.GUILD.GUILD_CONFIG.joinroles`
		)) as DatabaseStructure.GuildConfigSchema["joinroles"];
		if (!roleid?.length) return;

		// After the captcha: its "Pending" role was given with the captcha
		// (`security/onMemberJoin.ts`) and just removed by it.
		const ids = (Array.isArray(roleid) ? roleid : [roleid]).filter(
			(id) => id !== ctx.captchaRemovedRole
		);
		const roles = joinRolesToGive(member, ids);
		if (roles.length === 0) return;
		// `add`, not `set`: the role saver gives roles back at the same time.
		await member.roles
			.add(roles, "[AutoRole] Assign role for new member")
			.catch(() => null);
	} catch {
		// best effort: the auto role must never break the join flow
	}
}
