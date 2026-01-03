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

import { BaseGuildTextChannel, Client, Message } from 'discord.js';

import { BotEvent } from '../../../types/event.js';
import { DatabaseStructure } from '../../../types/database_structure.js';

export const event: BotEvent = {
	name: "messageCreate",
	run: async (client: Client, message: Message) => {
		if (!message.guild ||
			message.author.bot ||
			message.content === ""
		) return;

		let baseData = await client.db.get(`${message.guild?.id}.COUNTER`) as DatabaseStructure.CounterSchema | undefined;
		let lastNumber = (await client.db.get(`${message.guild.id}.COUNTER_DATA`) || 0) as DatabaseStructure.CounterData;
		if (!baseData || baseData.channelId !== message.channelId) return;

		if (client.func.method.isNumber(message.content)) {
			let number = Number(message.content);

			if (number === lastNumber + 1) {
				const lang = await client.func.getLanguageData(message.guild.id);

				await client.db.add(`${message.guild.id}.COUNTER_DATA`, 1);
				message.react("✅").then(async (react) => {
					await Bun.sleep(6000);
					react.remove()
				});

				(message.channel as BaseGuildTextChannel).setTopic(lang.counter_actual_number.replace("{number}", number.toString()));
			} else {
				message.react("❌").then(async () => {
					await Bun.sleep(3000);
					if (message.deletable) message.delete()
				})
			}
		} else {
			message.react("❌").then(async () => {
				await Bun.sleep(3000); console.log(message.deletable)
				if (message.deletable) message.delete()
			})
		};
	},
};