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

import { Client, GuildMember } from "discord.js";

import { WelcomeContext } from "../../core/modules/memberArrival.js";

/**
 * Role saver, part of the welcome side: the roles a returning member had are
 * given back once the gates let them in (after the captcha when it is on).
 */
export async function restoreSavedRoles(
	client: Client,
	member: GuildMember,
	ctx: WelcomeContext = {}
): Promise<void> {
	if (
		await client.db.get(
			`${member.guild.id}.GUILD.GUILD_CONFIG.rolesaver.enable`
		)
	) {
		const array: string[] | null = await client.db.get(
			`${member.guild.id}.ROLE_SAVER.${member.user.id}`
		);

		if (!array || array.length === 0) return;

		// Only roles the bot can hand out: a single managed (booster, bot)
		// or higher role made the whole request fail. `add` keeps the
		// roles given on join (joinRole) instead of overwriting them.
		const ceiling = member.guild.members.me?.roles.highest.position ?? 0;
		const roles = array.filter((id) => {
			const role = member.guild.roles.cache.get(id);
			// Not the captcha's "Pending" role, removed a moment ago.
			return (
				id !== ctx.captchaRemovedRole &&
				!!role &&
				!role.managed &&
				role.position < ceiling
			);
		});

		if (roles.length > 0) {
			await member.roles
				.add(roles, "[RoleSaver] Give role back")
				.catch(() => false);
		}

		await client.db.delete(
			`${member.guild.id}.ROLE_SAVER.${member.user.id}`
		);
		return;
	}
}
