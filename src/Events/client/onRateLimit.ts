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

import { Client, RateLimitData } from 'discord.js';

import { BotEvent } from '../../../types/event.js';

export const restEvent: BotEvent = {
	name: "rateLimited",
	run: async (client: Client, data: RateLimitData) => {
		let msg = "⚠️ Rate limit detected\nRoute: " + data.route + "\nURL: " + data.url + "\nMethod: " + data.method + "\nScope: " + data.scope + "\nGlobal: " + data.global + "\nLimit: " + data.limit + "\nRetry After: " + data.retryAfter + "ms\nTime To Reset: " + data.timeToReset + "ms\nHash: " + data.hash + "\nMajor Param: " + data.majorParameter + "\nSublimit Timeout: " + data.sublimitTimeout + "ms";

		logger.err(msg)
		// if (client.email.connected) {
		// 	client.email.send(client.email.ownerMail, 'RATE-LIMIT', msg);
		// } else 
	},
};