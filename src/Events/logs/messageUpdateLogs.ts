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
import { BotEvent } from "../../../types/event.js";
import { LanguageData } from "../../../types/languageData.js";
import { messageDiff } from "../../core/functions/messageDiff.js";
import { LogCardOptions, sendLogCard } from "../../core/modules/logCard.js";

/**
 * The log card of an edited message: one ```diff block, `-` before (red) and
 * `+` after (green), only what changed (no `>>>` quote swallowing the card).
 */
export function editedMessageLog(
	oldMessage: Pick<Message, "guildId" | "channelId" | "id" | "content">,
	newMessage: Pick<Message, "author" | "content">,
	lang: LanguageData,
	emojis: Record<string, string>
): LogCardOptions {
	const link = `https://discord.com/channels/${oldMessage.guildId}/${oldMessage.channelId}/${oldMessage.id}`;
	return {
		kind: "edit",
		emoji: emojis.Paper,
		title: lang.logs_message_update_title,
		thumbnail: newMessage.author.displayAvatarURL(),
		fields: [
			{
				emoji: emojis.Ticket_User,
				label: lang.var_author,
				value: `<@${newMessage.author.id}>`
			},
			{
				emoji: emojis.Ticket_Hash,
				label: lang.logs_channel_label,
				value: `<#${oldMessage.channelId}>`
			},
			{
				emoji: emojis.Link_Icon,
				label: lang.var_message,
				value: `[${lang.logs_jump_to_message}](${link})`
			}
		],
		blocks: [
			`**${lang.event_srvLogs_messageUpdate_footer_1}** → **${lang.event_srvLogs_messageUpdate_footer_2}**\n\`\`\`diff\n${messageDiff(oldMessage.content, newMessage.content)}\n\`\`\``
		]
	};
}

export const event: BotEvent = {
	name: "messageUpdate",
	run: async (client: Client, oldMessage: Message, newMessage: Message) => {
		const data = await client.func.getLanguageData(oldMessage.guildId);

		if (!oldMessage || !oldMessage.guild) return;

		if (
			!newMessage.author ||
			newMessage.author.bot ||
			oldMessage.content === "" ||
			newMessage.content === ""
		)
			return;

		const someinfo = await client.db.get(
			`${oldMessage.guildId}.GUILD.SERVER_LOGS.message`
		);

		if (!someinfo || oldMessage.content === newMessage.content) return;

		const Msgchannel = oldMessage.guild.channels.cache.get(someinfo);
		if (!Msgchannel) return;

		if (
			oldMessage.partial ||
			newMessage.content === "" ||
			newMessage.content === null ||
			newMessage.content === undefined
		) {
			return;
		}

		await sendLogCard(
			Msgchannel,
			editedMessageLog(
				oldMessage,
				newMessage,
				data,
				client.iHorizon_Emojis
			)
		);
	}
};
