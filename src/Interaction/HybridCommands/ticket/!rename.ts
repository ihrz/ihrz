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
	BaseGuildTextChannel,
	ChatInputCommandInteraction,
	Client,
	Message,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var name = interaction.options.getString('name')!;
		} else {
			var name = client.func.method.string(args!, 0)!;
		}

		if (await client.db.get(`${interaction.guildId}.GUILD.TICKET.disable`)) {
			await client.func.method.interactionSend(interaction, { content: lang.ticket_disabled_command });
			return;
		};

		if (!await client.func.method.isTicketChannel(interaction.channel as BaseGuildTextChannel)) {
			await client.func.method.interactionSend(interaction, { content: lang.delete_not_in_ticket });
			return;
		}

		(interaction.channel as BaseGuildTextChannel).setName(name).then(async () => {
			await client.func.method.interactionSend(interaction, { content: lang.ticket_rename_ok });
		}).catch(async () => {
			await client.func.method.interactionSend(interaction, { content: lang.ticket_rename_error });
		});
	},
};