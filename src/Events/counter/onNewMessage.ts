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
		let lastNumber = (await client.db.get(`${message.guild.id}.COUNTER_DATA`) || { amount: 0, userId: client.user?.id }) as DatabaseStructure.CounterData;
		// BACKPORTABILITY
		if (typeof lastNumber === 'number') lastNumber = { amount: lastNumber, userId: client.user?.id! };

		if (!baseData || baseData.channelId !== message.channelId) return;

		const lang = await client.func.getLanguageData(message.guildId);

		if (client.func.method.isNumber(message.content)) {
			let number = Number(message.content);

			if ((number === lastNumber.amount + 1) && (message.author.id !== lastNumber.userId)) {
				const lang = await client.func.getLanguageData(message.guild.id);

				await client.db.set(`${message.guild.id}.COUNTER_DATA`, { amount: number, userId: message.author.id });
				message.react("✅");

				(message.channel as BaseGuildTextChannel).setTopic(lang.counter_actual_number.replace("{number}", number.toString()));
			} else {
				message.react("❌");
				await client.db.set(`${message.guild.id}.COUNTER_DATA`, { amount: 0, userId: null });

				if (message.author.id === lastNumber.userId) {
					message.reply({ content: lang.counter_error_too_much_u.replace("${message.author.id}", message.author.id).replace("${number}", number.toString()) });
				} else {
					message.reply({ content: lang.counter_error_syntaxic.replace("${message.author.id}", message.author.id) })
				}
			}
		} else {
			message.react("❌");
			await client.db.set(`${message.guild.id}.COUNTER_DATA`, { amount: 0, userId: message.author.id });
			message.reply({ content: lang.counter_error_syntaxic.replace("${message.author.id}", message.author.id) })
		};
	},
};