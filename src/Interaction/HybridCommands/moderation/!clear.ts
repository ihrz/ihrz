/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	BaseGuildTextChannel,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Message,
	PermissionsBitField,
} from 'discord.js';

import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;


		if (interaction instanceof ChatInputCommandInteraction) {
			var numberx = interaction.options.getNumber("number")!;
			var member = interaction.options.getMember("member");
		} else {
			var numberx = client.func.method.number(args!, 0);
			var member = client.func.method.member(interaction, args!, 1);
		};

		if (numberx && numberx > 100) {
			await client.func.method.interactionSend(interaction, {
				content: lang.clear_max_message_limit.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
			});
			return;
		};

		// if the member is found, fetch the messages and delete them
		if (member) {
			let fetchedMessages = await (interaction.channel as BaseGuildTextChannel).messages.fetch({
				limit: 100
			});

			let messages = Array.from(fetchedMessages.values()).filter((message) => message.author.id === member?.id);

			// splice the messages with the numberx
			if (numberx !== 0) {
				messages = messages.splice(0, numberx);
			}

			if (messages.length === 0) {
				await client.func.method.interactionSend(interaction, {
					content: "lang.clear_no_messages_found"
				});
				return;
			}

			(interaction.channel as BaseGuildTextChannel).bulkDelete(messages, true)
				.then(async (messages) => {
					client.func.method.channelSend(interaction, {
						content: lang.clear_confirmation_message
							.replace(/\${messages\.size}/g, messages.size.toString())
					});

					await client.func.ihorizon_logs(interaction, {
						title: lang.clear_logs_embed_title,
						description: lang.clear_logs_embed_description
							.replace(/\${interaction\.user\.id}/g, interaction.member?.user.id!)
							.replace(/\${messages\.size}/g, messages.size.toString())
							.replace(/\${interaction\.channel\.id}/g, interaction.channel?.id!)
					});
				});

			return;
		} else {
			(interaction.channel as BaseGuildTextChannel).bulkDelete(numberx, true)
				.then(async (messages) => {
					client.func.method.channelSend(interaction, {
						content: lang.clear_confirmation_message
							.replace(/\${messages\.size}/g, messages.size.toString())
					});

					await client.func.ihorizon_logs(interaction, {
						title: lang.clear_logs_embed_title,
						description: lang.clear_logs_embed_description
							.replace(/\${interaction\.user\.id}/g, interaction.member?.user.id!)
							.replace(/\${messages\.size}/g, messages.size.toString())
							.replace(/\${interaction\.channel\.id}/g, interaction.channel?.id!)
					});
				});
		}
	},
};