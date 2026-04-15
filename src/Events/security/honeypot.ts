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
	AnyThreadChannel,
	BaseGuildTextChannel,
	ChannelType,
	Client,
	EmbedBuilder,
	Message,
	TextChannel,
} from 'discord.js';

import logger from "../../core/logger.js";

import { DatabaseStructure } from '../../../types/database_structure.js';
import { BotEvent } from '../../../types/event.js';
import { LanguageData } from '../../../types/languageData.js';

const HONEYPOT_WINDOW_MS = 1000 * 60 * 60 * 2;
const HONEYPOT_EMBED_COLOR = "#D88A3D";

type HoneypotActionResult = "kick" | "ban" | "none" | "failed";
type HoneypotMessageChannel = BaseGuildTextChannel | AnyThreadChannel;

function getActionLabel(action: HoneypotActionResult, lang: LanguageData): string {
	switch (action) {
		case 'ban':
			return lang.setjoinroles_var_perm_ban_members;
		case 'kick':
			return lang.setjoinroles_var_perm_kick_members;
		case 'none':
			return lang.honeypot_action_none;
		default:
			return lang.honeypot_action_failed;
	}
}

function truncate(value: string, maxLength: number = 1024): string {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 3)}...`;
}

function isHoneypotChannel(channel: unknown): channel is HoneypotMessageChannel {
	if (!channel || typeof channel !== 'object') return false;
	if ('isThread' in channel && typeof channel.isThread === 'function' && channel.isThread()) return true;
	if ('type' in channel && (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement)) return true;
	return false;
}

async function collectChannels(message: Message): Promise<HoneypotMessageChannel[]> {
	const channels = new Map<string, HoneypotMessageChannel>();

	for (const channel of message.guild!.channels.cache.values()) {
		if (isHoneypotChannel(channel)) {
			channels.set(channel.id, channel);
		}
	}

	const activeThreads = await message.guild!.channels.fetchActiveThreads().catch(() => null);
	activeThreads?.threads.forEach((thread) => channels.set(thread.id, thread));

	return [...channels.values()];
}

async function deleteRecentMessages(message: Message): Promise<number> {
	const cutoff = Date.now() - HONEYPOT_WINDOW_MS;
	const channels = await collectChannels(message);
	let deletedCount = 0;

	for (const channel of channels) {
		let before: string | undefined;

		while (true) {
			const fetchedMessages = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
			if (!fetchedMessages || fetchedMessages.size === 0) {
				break;
			}

			const targetMessages = fetchedMessages.filter((entry) =>
				entry.author.id === message.author.id && entry.createdTimestamp >= cutoff
			);

			if (targetMessages.size > 0) {
				const deleted = await channel.bulkDelete([...targetMessages.keys()], true).catch(() => null);
				deletedCount += deleted?.size || 0;
			}

			const oldestMessage = fetchedMessages.last();
			if (!oldestMessage || oldestMessage.createdTimestamp < cutoff) {
				break;
			}

			before = oldestMessage.id;
		}
	}

	return deletedCount;
}

async function notifyUser(message: Message, actionLabel: string, lang: LanguageData): Promise<boolean> {
	const embed = new EmbedBuilder()
		.setColor(HONEYPOT_EMBED_COLOR)
		.setThumbnail("https://www.ihorizon.org/assets/img/honeypot.png")
		.setTitle(lang.honeypot_dm_title)
		.setDescription(
			lang.honeypot_dm_desc
				.replace("${guild}", message.guild!.name)
				.replace("${action}", actionLabel)
		);

	await message.author.send({ embeds: [embed] });
	return true;
}

async function applyConfiguredAction(
	message: Message,
	action: DatabaseStructure.HoneypotSchema["action"]
): Promise<HoneypotActionResult> {
	const member = message.member ?? await message.guild?.members.fetch(message.author.id).catch(() => null);

	switch (action) {
		case 'kick':
			if (!member?.kickable) {
				return 'failed';
			}

			const kickResult = await member.kick("Honeypot triggered").catch(() => null);
			return kickResult ? 'kick' : 'failed';
		case 'ban':
			if (!member?.bannable) {
				return 'failed';
			}

			const banResult = await message.guild?.members.ban(message.author.id, {
				reason: "Honeypot triggered",
				deleteMessageSeconds: 0
			}).catch(() => null);
			return banResult ? 'ban' : 'failed';
		default:
			return 'none';
	}
}

async function sendLogs(
	message: Message,
	lang: LanguageData,
	config: DatabaseStructure.HoneypotSchema,
	deletedCount: number,
	dmDelivered: boolean,
	actionResult: HoneypotActionResult
): Promise<void> {
	if (!config.logsChannelId) return;

	const logsChannel = await message.guild?.channels.fetch(config.logsChannelId).catch(() => null);
	if (!(logsChannel instanceof TextChannel)) return;

	const attachmentUrls = message.attachments.map((attachment) => attachment.url).join('\n');
	const stickerList = message.stickers.map((sticker) => sticker.name).join('\n');

	const logEmbed = new EmbedBuilder()
		.setColor(HONEYPOT_EMBED_COLOR)
		.setThumbnail("https://www.ihorizon.org/assets/img/honeypot.png")
		.setTitle(lang.honeypot_log_title.replace("${action}", getActionLabel(actionResult, lang)))
		.setTimestamp(message.createdAt)
		.addFields(
			{
				name: lang.honeypot_log_field_author,
				value: truncate(`${message.author.toString()}\n\`${message.author.id}\``),
				inline: true
			},
			{
				name: lang.honeypot_log_field_channel,
				value: message.channel.toString(),
				inline: true
			},
			{
				name: lang.honeypot_log_field_deleted_messages,
				value: `\`${deletedCount}\``,
				inline: true
			},
			{
				name: lang.honeypot_log_field_message,
				value: truncate(message.content || lang.honeypot_log_no_content),
				inline: false
			},
			{
				name: lang.honeypot_log_field_attachments,
				value: truncate(attachmentUrls || lang.var_none),
				inline: false
			},
			{
				name: lang.honeypot_log_field_stickers,
				value: truncate(stickerList || lang.var_none),
				inline: false
			},
			{
				name: lang.honeypot_log_field_dm_status,
				value: dmDelivered ? lang.honeypot_log_dm_open : lang.honeypot_log_dm_closed,
				inline: true
			},
			{
				name: lang.honeypot_log_field_result,
				value: getActionLabel(actionResult, lang),
				inline: true
			},
		);

	const firstImageAttachment = message.attachments.find((attachment) => attachment.contentType?.startsWith('image/') || attachment.width);
	if (firstImageAttachment) {
		logEmbed.setImage(firstImageAttachment.url);
	}

	await logsChannel.send({ embeds: [logEmbed] }).catch((error) => {
		logger.err(error);
	});
}

export const event: BotEvent = {
	name: "messageCreate",
	run: async (client: Client, message: Message) => {
		if (!message.guild || !message.channel || message.author.bot || message.webhookId) {
			return;
		}

		const config = await client.db.get(`${message.guildId}.GUILD.HONEYPOT`) as DatabaseStructure.HoneypotSchema | null;
		if (!config?.enabled || !config.channelId || message.channelId !== config.channelId) {
			return;
		}

		const lang = await client.func.getLanguageData(message.guildId);
		const actionLabel = getActionLabel(config.action, lang);

		const dmDelivered = await notifyUser(message, actionLabel, lang).catch(() => false);
		const deletedCount = await deleteRecentMessages(message).catch((error) => {
			logger.err(error);
			return 0;
		});
		const actionResult = await applyConfiguredAction(message, config.action).catch((error) => {
			logger.err(error);
			return 'failed' as HoneypotActionResult;
		});

		config.lastTriggeredAt = Date.now();
		await client.db.set(`${message.guildId}.GUILD.HONEYPOT`, config);
		await sendLogs(message, lang, config, deletedCount, dmDelivered, actionResult);
	},
};
