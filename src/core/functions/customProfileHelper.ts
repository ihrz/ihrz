/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { Guild } from "discord.js";

// https://discord.com/developers/docs/resources/guild#modify-current-member
export const GUILD_ME_WITH_GUILD_ID_ENDPOINT_URL = "https://discord.com/api/v10/guilds/{guild.id}/members/@me";

export async function changeGuildBotName(guild: Guild, nick: string): Promise<boolean> {
	const res = await fetch(GUILD_ME_WITH_GUILD_ID_ENDPOINT_URL.replace('{guild.id}', guild.id), {
		method: "PATCH",
		headers: {
			"Authorization": `Bot ${client.token}`,
			"X-Audit-Log-Reason": "OWNIHRZ INSIDE IHORIZON",
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			nick
		})
	});

	if (res.status === 200) return true;
	return false;
}

export async function changeGuildBotBanner(guild: Guild, banner: string): Promise<boolean> {
	const res = await fetch(GUILD_ME_WITH_GUILD_ID_ENDPOINT_URL.replace('{guild.id}', guild.id), {
		method: "PATCH",
		headers: {
			"Authorization": `Bot ${client.token}`,
			"X-Audit-Log-Reason": "OWNIHRZ INSIDE IHORIZON",
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			banner
		})
	});

	if (res.status === 200) return true;
	return false;
}

export async function changeGuildBotAvatar(guild: Guild, avatar: string): Promise<boolean> {
	const res = await fetch(GUILD_ME_WITH_GUILD_ID_ENDPOINT_URL.replace('{guild.id}', guild.id), {
		method: "PATCH",
		headers: {
			"Authorization": `Bot ${client.token}`,
			"X-Audit-Log-Reason": "OWNIHRZ INSIDE IHORIZON",
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			avatar
		})
	});

	if (res.status === 200) return true;
	return false;
}

export async function changeGuildBotBio(guild: Guild, bio: string): Promise<boolean> {
	const res = await fetch(GUILD_ME_WITH_GUILD_ID_ENDPOINT_URL.replace('{guild.id}', guild.id), {
		method: "PATCH",
		headers: {
			"Authorization": `Bot ${client.token}`,
			"X-Audit-Log-Reason": "OWNIHRZ INSIDE IHORIZON",
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			bio
		})
	});

	if (res.status === 200) return true;
	return false;
}