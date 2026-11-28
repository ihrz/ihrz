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

import { AnyThreadChannel, Client } from "discord.js";

import { BotEvent } from "../../../types/event.js";

// A thread ticket deleted by hand: channelDelete does not fire for threads.
export const event: BotEvent = {
	name: "threadDelete",
	run: async (client: Client, channel: AnyThreadChannel) => {
		const fetch = await client.db.get(`${channel.guild.id}.TICKET_ALL`);

		for (const user in fetch) {
			for (const channel_2 in fetch[user]) {
				// Only this ticket: the member's other tickets stay known.
				if (channel.id === channel_2) {
					await client.db.delete(
						`${channel.guild.id}.TICKET_ALL.${user}.${channel_2}`
					);
				}
			}
		}
	}
};
