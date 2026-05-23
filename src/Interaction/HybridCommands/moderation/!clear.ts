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

import {
	BaseGuildTextChannel,
	ChatInputCommandInteraction,
	Client,
	Collection,
	Message,
	MessageResolvable,
	Snowflake,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';


import { SubCommand } from '../../../../types/command.js';

export async function clearMessage(body: Collection<Snowflake, Message> | readonly MessageResolvable[] | number, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData): Promise<void> {

	(interaction.channel as BaseGuildTextChannel).bulkDelete(body, true)
		.then(async (messages) => {
			client.func.method.channelSend(interaction, {
				content: lang.clear_confirmation_message
					.replace('${messages.size}', messages.size.toString())
			}).then(x => setTimeout(() => x.deletable ?? x.delete(), 5000))

			await client.func.ihorizon_logs(interaction, {
				title: lang.clear_logs_embed_title,
				description: lang.clear_logs_embed_description
					.replace('${interaction.user.id}', interaction.member?.user.id!)
					.replace('${messages.size}', messages.size.toString())
					.replace('${interaction.channel.id}', interaction.channel?.id!)
			});
		});
	return;
};

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;


		if (interaction instanceof ChatInputCommandInteraction) {
			var amount = interaction.options.getNumber("number")! + 1;
			var member = interaction.options.getMember("member");
		} else {
			var amount = client.func.method.number(args!, 0) + 1;
			var member = client.func.method.member(interaction, args!, 1);
		};

		const channel = interaction.channel as BaseGuildTextChannel;

		if (member) {
			const targetAmount = Math.max(amount, 1);
			const maxScannedMessages = 1000;
			const matchedMessages: Message[] = [];
			let lastMessageId: string | undefined;
			let scannedMessages = 0;

			while (matchedMessages.length < targetAmount && scannedMessages < maxScannedMessages) {
				const remainingToScan = maxScannedMessages - scannedMessages;
				const fetchedMessages = await channel.messages.fetch({
					limit: Math.min(100, remainingToScan),
					before: lastMessageId
				});

				if (fetchedMessages.size === 0) {
					break;
				}

				scannedMessages += fetchedMessages.size;
				lastMessageId = fetchedMessages.last()?.id;

				for (const fetchedMessage of fetchedMessages.values()) {
					if (fetchedMessage.author.id !== member.id) {
						continue;
					}

					matchedMessages.push(fetchedMessage);

					if (matchedMessages.length >= targetAmount) {
						break;
					}
				}
			}

			if (matchedMessages.length === 0) {
				await client.func.method.interactionSend(interaction, {
					content: lang.clear_command_no_message
				});
				return;
			}

			await clearMessage(matchedMessages.slice(0, targetAmount), interaction, lang);
			return;
		} else {
			await clearMessage(amount, interaction, lang);
			return;
		}
	},
};