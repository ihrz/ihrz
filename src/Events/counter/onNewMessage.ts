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

import { BaseGuildTextChannel, Client, Message } from "discord.js";

import { BotEvent } from "../../../types/event.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { getCachedGuildValue } from "../../core/modules/guildConfigCache.js";

// Discord allows two topic changes per ten minutes and per channel
const TOPIC_UPDATE_INTERVAL_MS = 5 * 60_000;
const lastTopicUpdate = new Map<string, number>();

// Each count reads then writes COUNTER_DATA: messages of one guild are
// handled one after the other, so two quick numbers cannot both read the
// same previous value.
const countQueue = new Map<string, Promise<void>>();

function enqueueCount(guildId: string, task: () => Promise<void>) {
	const previous = countQueue.get(guildId) || Promise.resolve();
	const next = previous.then(task).catch((error: unknown) => {
		logger.err(`[Counter] ${guildId}: ${error}`);
	});
	countQueue.set(guildId, next);
	next.then(() => {
		if (countQueue.get(guildId) === next) countQueue.delete(guildId);
	});
	return next;
}

export const event: BotEvent = {
	name: "messageCreate",
	run: async (client: Client, message: Message) => {
		if (
			!message.guild ||
			message.author.bot ||
			message.webhookId ||
			message.content === ""
		)
			return;

		// Config first (cached): only the counter channel reads the count.
		const baseData =
			await getCachedGuildValue<DatabaseStructure.CounterSchema>(
				`${message.guild.id}.COUNTER`
			);
		if (
			!baseData ||
			baseData.channelId !== message.channelId ||
			baseData.config === "off"
		) {
			return;
		}

		const guildId = message.guild.id;

		await enqueueCount(guildId, async () => {
			let lastNumber = ((await client.db.get(
				`${guildId}.COUNTER_DATA`
			)) || {
				amount: 0,
				userId: client.user?.id
			}) as DatabaseStructure.CounterData;
			// BACKPORTABILITY
			if (typeof lastNumber === "number")
				lastNumber = { amount: lastNumber, userId: client.user?.id! };

			const lang = await client.func.getLanguageData(message.guildId);

			if (client.func.method.isNumber(message.content)) {
				let number = Number(message.content);

				if (
					number === lastNumber.amount + 1 &&
					message.author.id !== lastNumber.userId
				) {
					await client.db.set(`${guildId}.COUNTER_DATA`, {
						amount: number,
						userId: message.author.id
					});
					message.react("✅").catch(() => {});

					const now = Date.now();
					const lastUpdate =
						lastTopicUpdate.get(message.channelId) ?? 0;

					if (now - lastUpdate >= TOPIC_UPDATE_INTERVAL_MS) {
						lastTopicUpdate.set(message.channelId, now);
						(message.channel as BaseGuildTextChannel)
							.setTopic(
								lang.counter_actual_number.replace(
									"{number}",
									number.toString()
								)
							)
							.catch(() => {});
					}
				} else {
					message.react("❌").catch(() => {});
					await client.db.set(`${guildId}.COUNTER_DATA`, {
						amount: 0,
						userId: null
					});

					if (message.author.id === lastNumber.userId) {
						message
							.reply({
								content: lang.counter_error_too_much_u
									.replace(
										"${messageAuthorId}",
										message.author.id
									)
									.replace("${number}", number.toString())
							})
							.catch(() => {});
					} else {
						message
							.reply({
								content: lang.counter_error_syntaxic.replace(
									"${messageAuthorId}",
									message.author.id
								)
							})
							.catch(() => {});
					}
				}
			} else {
				message.react("❌").catch(() => {});
				await client.db.set(`${guildId}.COUNTER_DATA`, {
					amount: 0,
					userId: null
				});
				message
					.reply({
						content: lang.counter_error_syntaxic.replace(
							"${messageAuthorId}",
							message.author.id
						)
					})
					.catch(() => {});
			}
		});
	}
};
