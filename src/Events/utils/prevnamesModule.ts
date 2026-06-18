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

import { Client, User, time } from "discord.js";

import { BotEvent } from "../../../types/event.js";
import { prevnamesTable } from "../client/ready.js";

type PvNames = {
	timestamp: Date;
	nick: string;
};

export const prevnamesMap = new Map<string, PvNames[]>();

export const usersNamesMap = new Map<
	string,
	{
		username: string;
		globalName: string | null;
	}
>();

export const event: BotEvent = {
	name: "userUpdate",
	run: async (_client: Client, user: User) => {
		const oldData = usersNamesMap.get(user.id);

		if (!oldData) {
			usersNamesMap.set(user.id, {
				username: user.username,
				globalName: user.globalName
			});
			return;
		}

		const oldName = oldData.globalName ?? oldData.username;

		const newName = user.globalName ?? user.username;

		if (oldName === newName) return;

		await prevnamesTable.push(
			user.id,
			`${time(new Date(), "d")} - ${oldName}`
		);

		const history = prevnamesMap.get(user.id) ?? [];

		history.push({
			timestamp: new Date(),
			nick: oldName
		});

		prevnamesMap.set(user.id, history);

		usersNamesMap.set(user.id, {
			username: user.username,
			globalName: user.globalName
		});
	}
};
