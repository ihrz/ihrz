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

import { Client, Message } from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { Command } from "../../../../types/command.js";

export const command: Command = {
	name: "sticker",
	aliases: ["stickers"],

	description: "Add a sticker from the replied message",
	description_localizations: {
		fr: "Créer un sticker depuis un message répondu",
		ja: "返信メッセージからスタンプを追加",
		ru: "Добавить стикер из ответного сообщения",
		"es-ES": "Añadir un sticker del mensaje respondido"
	},

	thinking: false,
	category: "utils",
	type: "PREFIX_IHORIZON_COMMAND",

	permission: null,
	run: async (
		client: Client,
		message: Message<true>,
		lang: LanguageData,
		options?: string[]
	) => {
		if (message.reference) {
			const msg = await message.channel.messages.fetch(
				message.reference.messageId || ""
			);

			if (msg.stickers.size === 0) {
				return await client.func.method.interactionSend(message, {
					content: lang.sticket_no_sticker
				});
			} else {
				const sticker = msg.stickers.first()!;
				var cool_name = sticker.name;

				if (message.guild.vanityURLCode !== null) {
					cool_name += ` /${message.guild.vanityURLCode}`;
				}

				await message.guild.stickers
					.create({
						file: sticker.url,
						name: cool_name.substring(0, 30),
						description: sticker.description || lang.var_no_set,
						tags: sticker?.tags || "copied",
						reason:
							"Sticker command executed by " + message.author.id
					})
					.then(async (x) => {
						await client.func.method.interactionSend(message, {
							content: lang.sticket_command_work.replace(
								"${x.name}",
								x.name
							)
						});
					})
					.catch(async (err) => {
						await client.func.method.interactionSend(message, {
							content: lang.sticker_command_error.replace(
								"${err.message}",
								err.message
							)
						});
					});
			}
		} else {
			return await client.func.method.interactionSend(message, {
				content: lang.sticket_command_error2
			});
		}
		return;
	}
};
