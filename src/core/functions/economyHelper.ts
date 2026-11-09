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

import { Guild, GuildMember } from "discord.js";
import { DatabaseStructure } from "../../../types/database_structure";
import { LanguageData } from "../../../types/languageData";

export async function getMemberBoost(member: GuildMember): Promise<number> {
	try {
		const economyConfig = (await member.guild.client.db.get(
			`${member.guild.id}.ECONOMY`
		)) as DatabaseStructure.EconomyModel;

		// get the roles that the user has
		const role = Object.entries(economyConfig?.buyableRoles || [])
			.filter(([roleID]) => member?.roles.cache.has(roleID))
			.map(([roleID]) => roleID);

		// get the role with the highest boost
		const highestBoost = role
			.map((r) => economyConfig?.buyableRoles?.[r]?.boost ?? 0)
			.sort((a, b) => b - a)[0];

		// calculate the new money amount and add it to the user
		return highestBoost || 1;
	} catch {
		return 1;
	}
}

export async function pruneBuyableRoles(
	guild: Guild
): Promise<Record<string, DatabaseStructure.EconomyRole>> {
	const key = `${guild.id}.ECONOMY.buyableRoles`;
	const roleData = ((await guild.client.db.get(key)) || {}) as Record<
		string,
		DatabaseStructure.EconomyRole
	>;

	if (Object.keys(roleData).every((id) => guild.roles.cache.has(id))) {
		return roleData;
	}

	// the cache can be incomplete: only trust a successful full fetch
	const roles = await guild.roles.fetch().catch(() => null);
	if (!roles) return roleData;

	for (const roleId of Object.keys(roleData)) {
		if (roles.has(roleId)) continue;

		await guild.client.db.delete(`${key}.${roleId}`);
		delete roleData[roleId];
	}

	return roleData;
}

export function generateRoleFields(
	roleData: DatabaseStructure.EconomyModel["buyableRoles"],
	lang: LanguageData
): {
	name: string;
	value: string;
	amount: number;
	inline: boolean;
}[] {
	return Object.entries(roleData || {})
		.sort(([, amountA], [, amountB]) => Number(amountB) - Number(amountA))
		.map(([roleID, roleData], index) => ({
			name: `Role ${index + 1}`,
			value: `${lang.var_roles}: <@&${roleID}>\n${lang.var_price}: ${roleData.price}\nBoost: x${roleData.boost || 1}`,
			amount: roleData.price,
			inline: true
		}));
}
