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

import { BaseGuildTextChannel } from "discord.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";

export async function isTicketChannel(
	channel: BaseGuildTextChannel
): Promise<boolean> {
	const allTickets = (await channel.client.db.get(
		`${channel.guild.id}.TICKET_ALL`
	)) as DatabaseStructure.TicketData;

	if (!allTickets || typeof allTickets !== "object") {
		return false;
	}

	for (const authorId of Object.keys(allTickets)) {
		const ticketsByAuthor = allTickets[authorId];

		if (ticketsByAuthor && typeof ticketsByAuthor === "object") {
			for (const ticketId of Object.keys(ticketsByAuthor)) {
				const ticketData = ticketsByAuthor[ticketId];

				if (ticketData && ticketData.channel === channel.id) {
					return ticketData?.channel === channel.id;
				}
			}
		}
	}
	return false;
}

export async function deleteTicketChannelFromDatabase(
	channel: BaseGuildTextChannel
): Promise<boolean> {
	const allTickets = await channel.client.db.get(
		`${channel.guild.id}.TICKET_ALL`
	);

	if (!allTickets || typeof allTickets !== "object") {
		return false;
	}

	for (const authorId of Object.keys(allTickets)) {
		const ticketsByAuthor = allTickets[authorId];

		if (ticketsByAuthor && typeof ticketsByAuthor === "object") {
			for (const ticketId of Object.keys(ticketsByAuthor)) {
				const ticketData = ticketsByAuthor[ticketId];

				if (ticketData && ticketData.channel === channel.id) {
					await client.db.delete(
						`${channel.guild.id}.TICKET_ALL.${authorId}.${ticketId}`
					);
					return ticketData?.channel === channel.id;
				}
			}
		}
	}
	return false;
}
