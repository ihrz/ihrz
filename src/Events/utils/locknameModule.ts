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

import { BotEvent } from "../../../types/event.js";
import { DatabaseStructure } from "../../../types/database_structure.js";

export const event: BotEvent = {
	name: "guildMemberUpdate",
	run: async (
		client: Client,
		oldMember: GuildMember,
		newMember: GuildMember
	) => {
		if (oldMember.nickname === newMember.nickname) return;

		const lockedNameData =
			await client.db.get<DatabaseStructure.LockNameData | null>(
				`${newMember.guild.id}.LOCKNAME.${newMember.id}`
			);

		if (!lockedNameData) return;

		// Already matching the locked nickname: the revert itself fires this event.
		if (newMember.nickname === (lockedNameData.nick ?? null)) return;

		if (!newMember.manageable) return;

		await newMember
			.edit({ nick: lockedNameData.nick ?? null })
			.catch(() => {});
	}
};
