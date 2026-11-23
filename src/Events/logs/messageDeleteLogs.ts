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
	Attachment,
	AttachmentBuilder,
	Client,
	EmbedBuilder,
	Message
} from "discord.js";
import { axios } from "../../core/functions/axios.js";

import { BotEvent } from "../../../types/event.js";
import { LanguageData } from "../../../types/languageData.js";
import {
	LogAttachment,
	LogCardOptions,
	safeAttachmentName,
	sendLogCard
} from "../../core/modules/logCard.js";

/** A deleted message's attachment, re-uploaded (the original URL dies). */
async function download(
	file: Attachment,
	index: number
): Promise<LogAttachment | null> {
	try {
		const response = await axios.get(file.url, {
			responseType: "arrayBuffer"
		});
		return {
			file: new AttachmentBuilder(
				Buffer.from(response.data as ArrayBuffer),
				{
					name: safeAttachmentName(file.name, index)
				}
			),
			image: !!file.contentType?.startsWith("image/")
		};
	} catch {
		return null;
	}
}

/**
 * The log card of a deleted message: who, where, what it said, and its
 * attachments (images in the gallery, other files as files). Its embeds
 * can't be inside a Components V2 message: they are returned to be sent
 * as-is in a second message, right after the card.
 */
export function deletedMessageLog(
	message: Pick<Message, "author" | "channelId" | "content" | "embeds">,
	lang: LanguageData,
	emojis: Record<string, string>,
	attachments: LogAttachment[]
): { card: LogCardOptions; embeds: EmbedBuilder[] } {
	const embeds = message.embeds
		.slice(0, 10)
		.map((embed) => EmbedBuilder.from(embed));
	return {
		card: {
			kind: "danger",
			emoji: emojis.Ticket_Trash,
			title: lang.logs_message_delete_title,
			thumbnail: message.author.displayAvatarURL(),
			fields: [
				{
					emoji: emojis.Ticket_User,
					label: lang.var_author,
					value: `<@${message.author.id}>`
				},
				{
					emoji: emojis.Ticket_Hash,
					label: lang.logs_channel_label,
					value: `<#${message.channelId}>`
				}
			],
			blocks: [
				message.content,
				embeds.length > 0 &&
					`-# ${lang.logs_message_delete_embeds.replace("${count}", String(embeds.length))}`
			],
			attachments
		},
		embeds
	};
}

export const event: BotEvent = {
	name: "messageDelete",
	run: async (client: Client, message: Message) => {
		const data = await client.func.getLanguageData(message.guildId);
		if (
			!message.guild ||
			!message.author ||
			message.author.id == client.user?.id
		)
			return;

		const someinfo = await client.db.get(
			`${message.guild.id}.GUILD.SERVER_LOGS.message`
		);
		if (!someinfo) return;

		const Msgchannel = message.guild.channels.cache.get(someinfo);
		if (!Msgchannel) return;

		const files = (
			await Promise.all(
				[...message.attachments.values()].map((file, i) =>
					download(file, i)
				)
			)
		).filter((file): file is LogAttachment => !!file);

		const { card, embeds } = deletedMessageLog(
			message,
			data,
			client.iHorizon_Emojis,
			files
		);

		const sent = await sendLogCard(Msgchannel, card);
		if (sent && embeds.length && Msgchannel.isSendable()) {
			await Msgchannel.send({
				embeds,
				allowedMentions: { parse: [] }
			}).catch(() => {});
		}
	}
};
