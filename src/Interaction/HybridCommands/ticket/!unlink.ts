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
	Message,
	TextChannel,
} from 'discord.js';

import { TicketTranscript } from '../../../core/modules/ticketsManager.js';
import { LanguageData } from '../../../../types/languageData.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

		if (await client.db.get(`${interaction.guildId}.GUILD.TICKET.disable`)) {
			await client.func.method.interactionSend(interaction, { content: lang.ticket_disabled_command });
			return;
		};

		if (!await client.func.method.isTicketChannel(interaction.channel as BaseGuildTextChannel)) {
			await client.func.method.interactionSend(interaction, { content: lang.transript_not_in_ticket });
			return;
		}

		let ticketChannel = interaction.channel as TextChannel;

		// Change name of the ticket
		await ticketChannel.setName(ticketChannel.name.replace('ticket', 'channel'));

		let panelMessage = (await ticketChannel.messages.fetch({ after: "0", limit: 1 })).first();

		if (panelMessage) {
			panelMessage.edit({
				content: lang.ticket_unlink_panel_edited_content.replace("{user}", interaction.member.user.toString()),
				embeds: [],
				components: [],
				files: []
			})
		}

		client.func.method.deleteTicketChannelFromDatabase(ticketChannel);
		client.func.method.interactionSend(interaction, {
			content: lang.ticket_unlink_command_ok.replace("${client.iHorizon_Emojis.Yes}", client.iHorizon_Emojis.Yes)
		})
	}
};