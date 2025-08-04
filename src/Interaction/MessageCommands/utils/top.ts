/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	Client,
	Message,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


export const command: Command = {
	name: "top",

	description: "Get the link of the first message in the channel",
	description_localizations: {
		"fr": "Créer un embed par rapport à iHorizon"
	},

	aliases: [],

	thinking: false,
	type: "PREFIX_IHORIZON_COMMAND",

	permission: null,

	category: "utils",
	run: async (client: Client, message: Message<true>, lang: LanguageData, options?: string[]) => {
		const channel = message.channel;
		channel.messages.fetch({ after: "0", limit: 1 }).then((messages) => {
			const firstMessage = messages.first();
			const link = `https://discord.com/channels/${message.guild?.id}/${channel.id}`;

			if (firstMessage) {
				client.func.method.channelSend(
					message,
					`The first message in this channel is [here](${link}/${firstMessage.id})`,
				);
			} else {
				client.func.method.channelSend(message, "No messages found in this channel");
			}
		});
	},
};
