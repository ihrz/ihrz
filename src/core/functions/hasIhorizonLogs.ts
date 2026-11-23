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

import { BaseGuildTextChannel, Guild } from "discord.js";

import { isStaffOnlyChannel } from "../modules/warnSystem.js";

/**
 * The server's iHorizon logs channel: the first text channel whose name contains "ihorizon-logs" that @everyone
 * cannot see. A public channel with that name is never used: the logs name members and moderators and quote
 * reasons, which the whole server would then read.
 */
export function findIhorizonLogsChannel(
	guild: Guild | null | undefined
): BaseGuildTextChannel | undefined {
	return guild?.channels.cache.find(
		(channel) =>
			channel.name.includes("ihorizon-logs") &&
			channel.isTextBased() &&
			isStaffOnlyChannel(channel)
	) as BaseGuildTextChannel | undefined;
}

export default function hasIhorizonLogs(guild: Guild): boolean {
	return !!findIhorizonLogsChannel(guild);
}
