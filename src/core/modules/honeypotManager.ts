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
	TextChannel
} from "discord.js";

import { DatabaseStructure } from "../../../types/database_structure.js";
import { LanguageData } from "../../../types/languageData.js";

import logger from "../logger.js";

const HONEYPOT_WINDOW_MS = 1000 * 60 * 60 * 2;
const HONEYPOT_EMBED_COLOR = "#D88A3D";
const HONEYPOT_TRIGGER_DELAY = 1500;

type HoneypotMessageChannel = BaseGuildTextChannel | AnyThreadChannel;
export type HoneypotActionResult = "kick" | "ban" | "none" | "failed";

interface ScheduledHoneypotTrigger {
	message: Message;
	sequence: number;
	triggerCount: number;
}

const honeypotTriggerQueue = new Map<string, Promise<void>>();
const honeypotTriggerTimeouts = new Map<
	string,
	ReturnType<typeof setTimeout>
>();
const honeypotScheduledTriggers = new Map<string, ScheduledHoneypotTrigger>();

function getHoneypotQueueKey(
	guildId: string,
	channelId: string,
	userId: string
): string {
	return `${guildId}.${channelId}.${userId}`;
}

function getLogActionLabel(
	action: HoneypotActionResult,
	lang: LanguageData
): string {
	switch (action) {
		case "ban":
			return lang.honeypot_log_action_ban;
		case "kick":
			return lang.honeypot_log_action_kick;
		case "none":
			return lang.honeypot_log_action_none;
		default:
			return lang.honeypot_action_failed;
	}
}

function getDMActionMessage(
	action: HoneypotActionResult,
	lang: LanguageData
): string {
	switch (action) {
		case "ban":
			return lang.honeypot_dm_action_banned;
		case "kick":
			return lang.honeypot_dm_action_kicked;
		case "none":
			return lang.honeypot_dm_action_none;
		default:
			return lang.honeypot_action_failed;
	}
}

function truncate(value: string, maxLength: number = 1024): string {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 3)}...`;
}

function isHoneypotChannel(
	channel: unknown
): channel is HoneypotMessageChannel {
	if (!channel || typeof channel !== "object") return false;
	if (
		"isThread" in channel &&
		typeof channel.isThread === "function" &&
		channel.isThread()
	)
		return true;
	if (
		"type" in channel &&
		(channel.type === ChannelType.GuildText ||
			channel.type === ChannelType.GuildAnnouncement)
	)
		return true;
	return false;
}

async function collectChannels(
	message: Message
): Promise<HoneypotMessageChannel[]> {
	const channels = new Map<string, HoneypotMessageChannel>();

	for (const channel of message.guild!.channels.cache.values()) {
		if (isHoneypotChannel(channel)) {
			channels.set(channel.id, channel);
		}
	}

	const activeThreads = await message
		.guild!.channels.fetchActiveThreads()
		.catch(() => null);
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
			const fetchedMessages = await channel.messages
				.fetch({ limit: 100, before })
				.catch(() => null);
			if (!fetchedMessages || fetchedMessages.size === 0) {
				break;
			}

			const targetMessages = fetchedMessages.filter(
				(entry) =>
					entry.author.id === message.author.id &&
					entry.createdTimestamp >= cutoff
			);

			if (targetMessages.size > 0) {
				const deleted = await channel
					.bulkDelete([...targetMessages.keys()], true)
					.catch(() => null);
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

async function notifyUser(
	message: Message,
	actionLabel: string,
	lang: LanguageData
): Promise<boolean> {
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
	const member =
		message.member ??
		(await message.guild?.members
			.fetch(message.author.id)
			.catch(() => null));

	switch (action) {
		case "kick":
			if (!member?.kickable) {
				return "failed";
			}

			const kickResult = await member
				.kick("Honeypot triggered")
				.catch(() => null);
			return kickResult ? "kick" : "failed";
		case "ban":
			if (!member?.bannable) {
				return "failed";
			}

			const banResult = await message.guild?.members
				.ban(message.author.id, {
					reason: "Honeypot triggered",
					deleteMessageSeconds: 60 * 60 // 3600 secondes
				})
				.catch(() => null);
			return banResult ? "ban" : "failed";
		default:
			return "none";
	}
}

async function sendLogs(
	message: Message,
	lang: LanguageData,
	config: DatabaseStructure.HoneypotSchema,
	deletedCount: number,
	dmDelivered: boolean,
	actionResult: HoneypotActionResult,
	triggerCount: number
): Promise<void> {
	if (!config.logsChannelId) return;

	const logsChannel = await message.guild?.channels
		.fetch(config.logsChannelId)
		.catch((error: unknown) => {
			logger.warn(
				`Honeypot logs channel fetch failed for guild ${message.guildId}: ${String(error)}`
			);
			return null;
		});

	if (!(logsChannel instanceof TextChannel)) {
		logger.warn(
			`Honeypot logs channel unavailable for guild ${message.guildId}: ${config.logsChannelId}`
		);
		return;
	}

	const attachmentUrls = message.attachments
		.map((attachment) => attachment.url)
		.join("\n");
	const stickerList = message.stickers
		.map((sticker) => sticker.name)
		.join("\n");

	const logEmbed = new EmbedBuilder()
		.setColor(HONEYPOT_EMBED_COLOR)
		.setThumbnail("https://www.ihorizon.org/assets/img/honeypot.png")
		.setTitle(
			lang.honeypot_log_title.replace(
				"${action}",
				getLogActionLabel(actionResult, lang)
			)
		)
		.setTimestamp(message.createdAt)
		.addFields(
			{
				name: lang.honeypot_log_field_author,
				value: truncate(
					`${message.author.toString()}\n\`${message.author.id}\``
				),
				inline: true
			},
			{
				name: lang.honeypot_log_field_channel,
				value: message.channel.toString(),
				inline: true
			},
			{
				name: lang.honeypot_log_field_triggered_messages,
				value: `\`${triggerCount}\``,
				inline: true
			},
			{
				name: lang.honeypot_log_field_deleted_messages,
				value: `\`${deletedCount}\``,
				inline: true
			},
			{
				name: lang.honeypot_log_field_embeds,
				value: `\`${message.embeds.length}\``,
				inline: true
			},
			{
				name: lang.honeypot_log_field_dm_status,
				value: dmDelivered
					? lang.honeypot_log_dm_open
					: lang.honeypot_log_dm_closed,
				inline: true
			},
			{
				name: lang.honeypot_log_field_message,
				value: truncate(
					message.content || lang.honeypot_log_no_content
				),
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
				name: lang.honeypot_log_field_result,
				value: getLogActionLabel(actionResult, lang),
				inline: true
			}
		);

	const firstImageAttachment = message.attachments.find(
		(attachment) =>
			attachment.contentType?.startsWith("image/") || attachment.width
	);
	if (firstImageAttachment) {
		logEmbed.setImage(firstImageAttachment.url);
	}

	await logsChannel.send({ embeds: [logEmbed] }).catch((error: unknown) => {
		logger.warn(
			`Honeypot log send failed for guild ${message.guildId}: ${String(error)}`
		);
	});
}

export async function processHoneypotTrigger(
	client: Client,
	message: Message,
	triggerCount: number = 1
): Promise<void> {
	if (
		!message.guild ||
		!message.channel ||
		message.author.bot ||
		message.webhookId
	) {
		return;
	}

	const config = (await client.db.get(
		`${message.guildId}.GUILD.HONEYPOT`
	)) as DatabaseStructure.HoneypotSchema | null;
	if (
		!config?.enabled ||
		!config.channelId ||
		message.channelId !== config.channelId
	) {
		logger.debug(
			`Honeypot trigger skipped for guild ${message.guildId}, channel ${message.channelId}, user ${message.author.id}: configuration changed`
		);
		return;
	}

	const lang = await client.func.getLanguageData(message.guildId);
	const dmActionMessage = getDMActionMessage(config.action, lang);

	const dmDelivered = await notifyUser(message, dmActionMessage, lang).catch(
		(error: unknown) => {
			logger.warn(
				`Honeypot DM failed for guild ${message.guildId}, user ${message.author.id}: ${String(error)}`
			);
			return false;
		}
	);

	const deletedCount = await deleteRecentMessages(message).catch(
		(error: unknown) => {
			logger.warn(
				`Honeypot cleanup failed for guild ${message.guildId}, user ${message.author.id}: ${String(error)}`
			);
			return 0;
		}
	);

	const actionResult = await applyConfiguredAction(
		message,
		config.action
	).catch((error: unknown) => {
		logger.warn(
			`Honeypot action execution failed for guild ${message.guildId}, user ${message.author.id}: ${String(error)}`
		);
		return "failed" as HoneypotActionResult;
	});

	if (actionResult === "failed" && config.action !== "none") {
		logger.warn(
			`Honeypot action failed for guild ${message.guildId}, channel ${message.channelId}, user ${message.author.id}: ${config.action}`
		);
	}

	config.lastTriggeredAt = Date.now();
	await client.db.set(`${message.guildId}.GUILD.HONEYPOT`, config);
	await sendLogs(
		message,
		lang,
		config,
		deletedCount,
		dmDelivered,
		actionResult,
		triggerCount
	);
}

async function queueHoneypotTrigger(
	client: Client,
	queueKey: string,
	sequence: number
): Promise<void> {
	const previousTask =
		honeypotTriggerQueue.get(queueKey) || Promise.resolve();
	const nextTask = previousTask
		.catch((error: unknown) => {
			logger.warn(
				`Honeypot queue recovered for ${queueKey}: ${String(error)}`
			);
		})
		.then(async () => {
			const scheduledTrigger = honeypotScheduledTriggers.get(queueKey);

			if (!scheduledTrigger || scheduledTrigger.sequence !== sequence) {
				return;
			}

			honeypotScheduledTriggers.delete(queueKey);
			await processHoneypotTrigger(
				client,
				scheduledTrigger.message,
				scheduledTrigger.triggerCount
			);
		});

	honeypotTriggerQueue.set(queueKey, nextTask);

	try {
		await nextTask;
	} finally {
		if (honeypotTriggerQueue.get(queueKey) === nextTask) {
			honeypotTriggerQueue.delete(queueKey);
		}
	}
}

export function scheduleHoneypotTrigger(
	client: Client,
	message: Message
): void {
	if (!message.guild) return;

	const queueKey = getHoneypotQueueKey(
		message.guildId!,
		message.channelId,
		message.author.id
	);
	const existingTimeout = honeypotTriggerTimeouts.get(queueKey);
	const existingTrigger = honeypotScheduledTriggers.get(queueKey);
	const nextSequence = (existingTrigger?.sequence ?? 0) + 1;
	const nextTriggerCount = (existingTrigger?.triggerCount ?? 0) + 1;

	if (existingTimeout) {
		clearTimeout(existingTimeout);
		honeypotTriggerTimeouts.delete(queueKey);
	}

	honeypotScheduledTriggers.set(queueKey, {
		message,
		sequence: nextSequence,
		triggerCount: nextTriggerCount
	});

	logger.debug(
		`Honeypot trigger scheduled for guild ${message.guildId}, channel ${message.channelId}, user ${message.author.id}, count ${nextTriggerCount}`
	);

	const nextTimeout = setTimeout(async () => {
		honeypotTriggerTimeouts.delete(queueKey);
		await queueHoneypotTrigger(client, queueKey, nextSequence);
	}, HONEYPOT_TRIGGER_DELAY);

	honeypotTriggerTimeouts.set(queueKey, nextTimeout);
}
