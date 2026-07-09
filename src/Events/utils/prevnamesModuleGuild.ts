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

import { Client, GuildMember, time } from "discord.js";
import { BotEvent } from "../../../types/event.js";
import { prevnamesTable } from "../client/ready.js";
import {
	prevnamesMap,
	usersNamesMap,
	usersNicknamesMap
} from "../../core/prevnamesModule.ts";

export const event: BotEvent = {
	name: "guildMemberUpdate",
	run: async (
		_client: Client,
		oldMember: GuildMember,
		newMember: GuildMember
	) => {
		const guildId = newMember.guild.id;

		const cachedGuildNicks = usersNicknamesMap.get(newMember.id);
		const previousNickname =
			cachedGuildNicks?.get(guildId) ?? oldMember.nickname;
		const newNickname = newMember.nickname;

		if (previousNickname === newNickname) return;

		const guildNicknames =
			usersNicknamesMap.get(newMember.id) ??
			new Map<string, string | null>();
		guildNicknames.set(guildId, newNickname);
		usersNicknamesMap.set(newMember.id, guildNicknames);

		if (previousNickname === null || previousNickname === undefined) return;

		await prevnamesTable.push(
			newMember.id,
			`${time(new Date(), "d")} - [nickname:${newMember.guild.name}] ${previousNickname}`
		);

		const history = prevnamesMap.get(newMember.id) ?? [];
		history.push({
			timestamp: new Date(),
			type: "nickname",
			guildId,
			value: previousNickname
		});
		prevnamesMap.set(newMember.id, history);
	}
};
