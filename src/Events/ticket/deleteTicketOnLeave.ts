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
	Client,
	GuildMember,
	TextChannel
} from "discord.js";

import { BotEvent } from "../../../types/event.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { DiscordJSTranscript } from "sweety-html-transcripts/adapters/discordjs";
import { sendTicketLog } from "../../core/modules/ticketsManager.js";
import { saveTicketTranscript } from "../../core/modules/ticketTranscripts.js";

export const event: BotEvent = {
	name: "guildMemberRemove",
	run: async (client: Client, member: GuildMember) => {
		const tickets = (await client.db.get(
			`${member.guild.id}.TICKET_ALL.${member.user.id}`
		)) as DatabaseStructure.TicketUserData | null;
		if (!tickets || !Object.keys(tickets).length) return;

		const lang = await client.func.getLanguageData(member.guild.id);
		const logsChannelId = await client.db.get(
			`${member.guild.id}.GUILD.TICKET.logs`
		);
		const logsChannel = logsChannelId
			? member.guild.channels.cache.get(logsChannelId)
			: undefined;

		// Every ticket of the member who left is closed: transcript and log
		// entry first (when a log channel is set), then the channel goes.
		for (const ticket of Object.values(tickets)) {
			const channel = ticket?.channel
				? member.guild.channels.cache.get(ticket.channel)
				: undefined;

			// The web transcript (ticket.ihorizon.org) outlives the channel.
			const webUrl =
				channel instanceof BaseGuildTextChannel
					? await saveTicketTranscript(
							channel,
							member.user.id,
							null,
							"delete"
						)
					: null;

			if (channel?.isTextBased() && logsChannel?.isSendable()) {
				// The link replaces the HTML file when there is a web transcript.
				const attachment = webUrl
					? null
					: await DiscordJSTranscript.create({
							channel: channel as TextChannel,
							limit: -1,
							filename: `${member.guild.id}-${channel.id}-transcript.html`,
							footerText: "Exported {number} message{s}",
							poweredBy: false
						}).catch(() => null);

				await sendTicketLog(member.guild, {
					kind: "deleted",
					title: lang.event_ticket_logsChannel_onDelete_embed_title,
					description:
						lang.event_ticket_logsChannel_onLeave_embed_desc
							.replace("${author}", member.user.toString())
							.replace("${channelName}", channel.name),
					files: attachment ? [attachment] : [],
					link: webUrl
						? {
								url: webUrl,
								label: lang.ticket_module_button_transcript
							}
						: null
				});
			}

			await channel?.delete().catch(() => {});
		}

		await client.db.delete(
			`${member.guild.id}.TICKET_ALL.${member.user.id}`
		);
	}
};
