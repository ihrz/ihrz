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
import { prevnamesMap, usersNamesMap } from "../../core/prevnamesModule.ts";

export const event: BotEvent = {
	name: "userUpdate",
	run: async (_client: Client, oldUser: User, newUser: User) => {
		const cached = usersNamesMap.get(newUser.id);

		const previousUsername = cached?.username ?? oldUser.username;
		const previousGlobalName = cached?.globalName ?? oldUser.globalName;

		const changes: { type: "username" | "globalName"; oldValue: string }[] =
			[];

		if (previousUsername !== newUser.username) {
			changes.push({ type: "username", oldValue: previousUsername });
		}

		if (
			previousGlobalName !== newUser.globalName &&
			previousGlobalName !== null &&
			previousGlobalName !== undefined
		) {
			changes.push({ type: "globalName", oldValue: previousGlobalName });
		}

		for (const change of changes) {
			await prevnamesTable.push(
				newUser.id,
				`${time(new Date(), "d")} - [${change.type}] ${change.oldValue}`
			);

			const history = prevnamesMap.get(newUser.id) ?? [];
			history.push({
				timestamp: new Date(),
				type: change.type,
				value: change.oldValue
			});
			prevnamesMap.set(newUser.id, history);
		}

		usersNamesMap.set(newUser.id, {
			username: newUser.username,
			globalName: newUser.globalName
		});
	}
};
