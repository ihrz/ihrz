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
	ActionRowBuilder,
	AnyThreadChannel,
	BaseGuildTextChannel,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	Client,
	Collection,
	ContainerBuilder,
	EmbedBuilder,
	Guild,
	Message,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	Snowflake,
	TextDisplayBuilder,
	type TextChannel,
	ThumbnailBuilder,
	VoiceChannel
} from "discord.js";
import { isChannelOfType } from "../functions/typeGuards.js";

import { DatabaseStructure } from "../../../types/database_structure.js";
import { LanguageData } from "../../../types/languageData.js";

import logger from "../logger.js";
import { LogCardOptions, sendLogCard } from "./logCard.js";
import {
	iHorizonAsset,
	iHorizonAssetURL
} from "../functions/iHorizonAssets.js";
import wait from "../functions/wait.js";

const HONEYPOT_WINDOW_MS = 1000 * 60 * 60 * 2;
export const HONEYPOT_EMBED_COLOR = "#D88A3D";
export const HONEYPOT_CREDIT_URL = "https://github.com/RiskyMH/honeypot";
const HONEYPOT_TRIGGER_DELAY = 1500;
const HONEYPOT_SECOND_PASS_DELAY_MS = 8000;
/** The counter button under the trap message (Buttons/honeypot-count.ts). */
export const HONEYPOT_COUNT_BUTTON = "honeypot-count";
/** A raid sanctions many accounts in a row: one edit of the trap message for the lot. */
const TRAP_REFRESH_DELAY_MS = 3000;

type HoneypotMessageChannel =
	BaseGuildTextChannel | AnyThreadChannel | VoiceChannel;
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
			channel.type === ChannelType.GuildAnnouncement ||
			channel.type === ChannelType.GuildVoice ||
			channel.type === ChannelType.GuildForum ||
			channel.type === ChannelType.GuildMedia ||
			channel.type === ChannelType.GuildStageVoice)
	)
		return true;
	return false;
}

async function collectChannels(
	message: Message
): Promise<HoneypotMessageChannel[]> {
	const channels = new Map<string, HoneypotMessageChannel>();
	const guild = message.guild!;

	// Never rely on the cache alone: swept/uncached channels would keep
	// their spam forever.
	const fetched = await guild.channels.fetch().catch(() => null);
	const source = fetched
		? [...fetched.values()]
		: [...guild.channels.cache.values()];

	for (const channel of source) {
		if (channel && isHoneypotChannel(channel)) {
			channels.set(channel.id, channel);
		}
	}

	const activeThreads = await guild.channels
		.fetchActiveThreads()
		.catch(() => null);
	activeThreads?.threads.forEach((thread) =>
		channels.set(thread.id, thread as HoneypotMessageChannel)
	);

	// Best effort: spam may also sit in archived threads/posts.
	for (const parent of [...channels.values()]) {
		if (
			!("threads" in parent) ||
			typeof (parent as BaseGuildTextChannel).threads?.fetchArchived !==
				"function"
		) {
			continue;
		}
		if (
			parent.type !== ChannelType.GuildText &&
			parent.type !== ChannelType.GuildAnnouncement &&
			parent.type !== ChannelType.GuildForum
		) {
			continue;
		}
		const archived = await (parent as BaseGuildTextChannel).threads
			.fetchArchived({ type: "public", fetchAll: true })
			.catch(() => null);
		archived?.threads.forEach((thread) => {
			if (!channels.has(thread.id)) {
				channels.set(thread.id, thread as HoneypotMessageChannel);
			}
		});
	}

	return [...channels.values()];
}

interface HoneypotCleanupResult {
	deletedCount: number;
	failedChannelIds: string[];
	scannedChannels: number;
}

async function deleteRecentMessages(
	message: Message
): Promise<HoneypotCleanupResult> {
	const cutoff = Date.now() - HONEYPOT_WINDOW_MS;
	const channels = await collectChannels(message);
	let deletedCount = 0;
	const failedChannelIds: string[] = [];

	for (const channel of channels) {
		try {
			for (let before: string | undefined = undefined; ;) {
				const fetchedMessages: Collection<Snowflake, Message> | null =
					await channel.messages
						.fetch({ limit: 100, before })
						.catch(() => null);

				if (!fetchedMessages || fetchedMessages.size === 0) break;

				const targetMessages = fetchedMessages.filter(
					(entry: Message) =>
						entry.author.id === message.author.id &&
						entry.createdTimestamp >= cutoff
				);

				if (targetMessages.size === 1) {
					const onlyMessage = targetMessages.first()!;
					const deleted = await onlyMessage
						.delete()
						.catch(() => null);
					if (deleted) deletedCount += 1;
				} else if (targetMessages.size > 1) {
					const deleted = await channel
						.bulkDelete([...targetMessages.keys()], true)
						.catch(() => null);
					deletedCount += deleted?.size ?? 0;
				}

				const oldestMessage: Message | undefined =
					fetchedMessages.last();
				const reachedCutoff =
					!oldestMessage || oldestMessage.createdTimestamp < cutoff;
				const reachedChannelStart = fetchedMessages.size < 100;

				if (reachedCutoff || reachedChannelStart) break;

				before = oldestMessage!.id;
			}
		} catch (error: unknown) {
			failedChannelIds.push(channel.id);
			logger.warn(
				`Honeypot cleanup skipped channel ${channel.id} in guild ${message.guildId}: ${String(error)}`
			);
		}
	}

	return { deletedCount, failedChannelIds, scannedChannels: channels.length };
}

async function notifyUser(
	message: Message,
	actionLabel: string,
	lang: LanguageData
): Promise<boolean> {
	const embed = new EmbedBuilder()
		.setColor(HONEYPOT_EMBED_COLOR)
		.setThumbnail(iHorizonAssetURL(iHorizonAsset.Honeypot))
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
		case "kick": {
			if (!member?.kickable) {
				return "failed";
			}

			const kickResult = await member
				.kick("Honeypot triggered")
				.catch(() => null);
			return kickResult ? "kick" : "failed";
		}
		case "ban": {
			// A spam bot that already left can still be banned by id.
			if (member && !member.bannable) {
				return "failed";
			}

			const banResult = await message.guild?.members
				.ban(message.author.id, {
					reason: "Honeypot triggered",
					deleteMessageSeconds: (HONEYPOT_WINDOW_MS / 1000) | 0
				})
				.catch(() => null);
			return banResult ? "ban" : "failed";
		}
		default:
			return "none";
	}
}

/** The honeypot log entry: a Components V2 log card (logCard.ts), like the other log channels, no pings. */
export function honeypotLogCard(
	message: Message,
	lang: LanguageData,
	deletedCount: number,
	dmDelivered: boolean,
	actionResult: HoneypotActionResult,
	triggerCount: number
): LogCardOptions {
	const attachmentUrls = message.attachments
		.map((attachment) => attachment.url)
		.join("\n");
	const stickerList = message.stickers
		.map((sticker) => sticker.name)
		.join("\n");

	const firstImageAttachment = message.attachments.find(
		(attachment) =>
			attachment.contentType?.startsWith("image/") || attachment.width
	);
	const result = getLogActionLabel(actionResult, lang);
	const e = message.client.iHorizon_Emojis;

	return {
		kind: actionResult === "none" ? "edit" : "danger",
		emoji: e?.Honey_Pot,
		title: lang.honeypot_log_title.replace("${action}", result),
		thumbnail: message.author.displayAvatarURL(),
		fields: [
			{
				emoji: e?.Ticket_User,
				label: lang.honeypot_log_field_author,
				value: `${message.author.toString()} (\`${message.author.id}\`)`
			},
			{
				emoji: e?.Ticket_Hash,
				label: lang.honeypot_log_field_channel,
				value: message.channel.toString()
			},
			{
				label: lang.honeypot_log_field_triggered_messages,
				value: `\`${triggerCount}\``
			},
			{
				label: lang.honeypot_log_field_deleted_messages,
				value: `\`${deletedCount}\``
			},
			{
				label: lang.honeypot_log_field_embeds,
				value: `\`${message.embeds.length}\``
			},
			{
				label: lang.honeypot_log_field_dm_status,
				value: dmDelivered
					? lang.honeypot_log_dm_open
					: lang.honeypot_log_dm_closed
			},
			{
				label: lang.honeypot_log_field_result,
				value: result
			}
		],
		blocks: [
			`**${lang.honeypot_log_field_message}**\n${truncate(
				message.content || lang.honeypot_log_no_content
			)}`,
			`**${lang.honeypot_log_field_attachments}**\n${truncate(
				attachmentUrls || lang.var_none
			)}`,
			`**${lang.honeypot_log_field_stickers}**\n${truncate(
				stickerList || lang.var_none
			)}`
		],
		images: [firstImageAttachment?.url],
		timestamp: message.createdTimestamp
	};
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

	const fetchedLogs = await message.guild?.channels
		.fetch(config.logsChannelId)
		.catch((error: unknown) => {
			logger.warn(
				`Honeypot logs channel fetch failed for guild ${message.guildId}: ${String(error)}`
			);
			return null;
		});

	if (!isChannelOfType(fetchedLogs, ChannelType.GuildText)) {
		logger.warn(
			`Honeypot logs channel unavailable for guild ${message.guildId}: ${config.logsChannelId}`
		);
		return;
	}
	const logsChannel = fetchedLogs as TextChannel;

	const sent = await sendLogCard(
		logsChannel,
		honeypotLogCard(
			message,
			lang,
			deletedCount,
			dmDelivered,
			actionResult,
			triggerCount
		)
	);
	if (!sent) {
		logger.warn(`Honeypot log send failed for guild ${message.guildId}`);
	}
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

	// Sanction first: it stops the bleeding (no new spam lands while the
	// slow channel-by-channel scan runs) and the native ban deletion wipes
	// the bulk server-side, including channels the bot cannot read itself.
	const actionResult = await applyConfiguredAction(
		message,
		config.action
	).catch((error: unknown) => {
		logger.warn(
			`Honeypot action execution failed for guild ${message.guildId}, user ${message.author.id}: ${String(error)}`
		);
		return "failed" as HoneypotActionResult;
	});

	const deletedFirstPass = await deleteRecentMessages(message).catch(
		(error: unknown) => {
			logger.warn(
				`Honeypot cleanup failed for guild ${message.guildId}, user ${message.author.id}: ${String(error)}`
			);
			return {
				deletedCount: 0,
				failedChannelIds: [],
				scannedChannels: 0
			} as HoneypotCleanupResult;
		}
	);

	// Safety net: anything posted while the first pass was scanning, or
	// missed by Discord's native ban deletion, is caught by a second sweep.
	await wait(HONEYPOT_SECOND_PASS_DELAY_MS);
	const deletedSecondPass = await deleteRecentMessages(message).catch(
		(error: unknown) => {
			logger.warn(
				`Honeypot second cleanup pass failed for guild ${message.guildId}, user ${message.author.id}: ${String(error)}`
			);
			return {
				deletedCount: 0,
				failedChannelIds: [],
				scannedChannels: 0
			} as HoneypotCleanupResult;
		}
	);

	const deletedCount =
		deletedFirstPass.deletedCount + deletedSecondPass.deletedCount;
	const failedChannelIds = [
		...new Set([
			...deletedFirstPass.failedChannelIds,
			...deletedSecondPass.failedChannelIds
		])
	];
	if (failedChannelIds.length > 0) {
		logger.warn(
			`Honeypot cleanup incomplete for guild ${message.guildId}, user ${message.author.id}: ${deletedCount} deleted, ${failedChannelIds.length} channel(s) skipped (${failedChannelIds.join(", ")})`
		);
	}

	if (actionResult === "failed" && config.action !== "none") {
		logger.warn(
			`Honeypot action failed for guild ${message.guildId}, channel ${message.channelId}, user ${message.author.id}: ${config.action}`
		);
	}

	await recordTrigger(
		client,
		message.guild,
		actionResult === "kick" || actionResult === "ban"
	);
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

function trapCountLabel(lang: LanguageData, count: number): string {
	if (count <= 0) return lang.honeypot_trap_count_none;
	if (count === 1) return lang.honeypot_trap_count_one;
	return lang.honeypot_trap_count_other.replace(
		"${caughtCount}",
		String(count)
	);
}

/**
 * The trap message (Components V2): warning, honeypot picture, and a button
 * with the number of accounts this trap sanctioned (kick or ban that went
 * through: a member the bot could not sanction, staff included, never
 * counts). The button only shows the stats (honeypot-count.ts).
 */
/** The pack emojis the trap message uses (client.iHorizon_Emojis). */
export type TrapEmojis = Pick<
	Client["iHorizon_Emojis"],
	"Security" | "Ban_Hammer"
>;

export function buildTrapMessage(
	lang: LanguageData,
	emojis: TrapEmojis,
	caughtCount: number = 0
) {
	const footer = lang.honeypot_trap_embed_footer
		.replace("${url}", HONEYPOT_CREDIT_URL)
		.split("\n")
		.map((line) => `-# ${line}`)
		.join("\n");

	const container = new ContainerBuilder()
		.setAccentColor(parseInt(HONEYPOT_EMBED_COLOR.slice(1), 16))
		.addSectionComponents(
			new SectionBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`## ${emojis.Security} ${lang.honeypot_trap_embed_title}`
					),
					new TextDisplayBuilder().setContent(
						lang.honeypot_trap_embed_desc
					)
				)
				.setThumbnailAccessory(
					new ThumbnailBuilder().setURL(
						iHorizonAssetURL(iHorizonAsset.Honeypot)
					)
				)
		)
		.addSeparatorComponents(
			new SeparatorBuilder()
				.setDivider(true)
				.setSpacing(SeparatorSpacingSize.Large)
		)
		.addActionRowComponents(
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(HONEYPOT_COUNT_BUTTON)
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(emojis.Ban_Hammer)
					.setLabel(trapCountLabel(lang, caughtCount))
			)
		)
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(footer));

	return {
		components: [container],
		flags: MessageFlags.IsComponentsV2 as const
	};
}

// One writer at a time per guild: two accounts caught together must both
// count (each trigger reads the config, then waits for its cleanup passes).
const guildLocks = new Map<string, Promise<unknown>>();
function withGuildLock<T>(guildId: string, task: () => Promise<T>): Promise<T> {
	const previous = guildLocks.get(guildId) ?? Promise.resolve();
	const next = previous.catch(() => {}).then(task);
	guildLocks.set(guildId, next);
	next.finally(() => {
		if (guildLocks.get(guildId) === next) guildLocks.delete(guildId);
	}).catch(() => {});
	return next;
}

/**
 * Notes the trigger on the config read fresh (an edit made during the
 * cleanup passes is kept), counts a sanction that went through, and
 * refreshes the trap message's counter.
 */
export async function recordTrigger(
	client: Client,
	guild: Guild,
	sanctioned: boolean
): Promise<void> {
	const path = `${guild.id}.GUILD.HONEYPOT`;
	await withGuildLock(guild.id, async () => {
		const config = (await client.db.get(
			path
		)) as DatabaseStructure.HoneypotSchema | null;
		if (!config) return;
		const now = Date.now();
		config.lastTriggeredAt = now;
		if (sanctioned) {
			config.caughtCount = (config.caughtCount ?? 0) + 1;
			config.lastSanctionedAt = now;
		}
		await client.db.set(path, config);
	});
	if (sanctioned) scheduleTrapRefresh(client, guild);
}

/**
 * Saves a config edited from a panel kept open (/honeypot config): the
 * trigger counters are the bot's, taken from the database at write time so
 * a sanction during the edit is not lost.
 */
export async function saveHoneypotConfig(
	client: Client,
	guildId: string,
	config: DatabaseStructure.HoneypotSchema
): Promise<void> {
	const path = `${guildId}.GUILD.HONEYPOT`;
	await withGuildLock(guildId, async () => {
		const stored = (await client.db.get(
			path
		)) as DatabaseStructure.HoneypotSchema | null;
		for (const key of [
			"lastTriggeredAt",
			"caughtCount",
			"lastSanctionedAt"
		] as const) {
			if (stored?.[key] !== undefined) config[key] = stored[key];
		}
		await client.db.set(path, config);
	});
}

const trapRefreshTimers = new Map<string, ReturnType<typeof setTimeout>>();
function scheduleTrapRefresh(client: Client, guild: Guild): void {
	if (trapRefreshTimers.has(guild.id)) return;
	const timer = setTimeout(() => {
		trapRefreshTimers.delete(guild.id);
		refreshTrapMessage(client, guild).catch((error: unknown) => {
			logger.warn(
				`Honeypot trap message refresh failed for guild ${guild.id}: ${String(error)}`
			);
		});
	}, TRAP_REFRESH_DELAY_MS);
	timer.unref?.();
	trapRefreshTimers.set(guild.id, timer);
}

/**
 * Puts the current count on the posted trap message. A trap posted before
 * Components V2 (an embed) cannot become one: it is reposted. A trap
 * message someone deleted stays deleted (reposted by /honeypot config or
 * the dashboard, as before).
 */
export async function refreshTrapMessage(
	client: Client,
	guild: Guild
): Promise<void> {
	const path = `${guild.id}.GUILD.HONEYPOT`;
	await withGuildLock(guild.id, async () => {
		const config = (await client.db.get(
			path
		)) as DatabaseStructure.HoneypotSchema | null;
		if (!config?.enabled || !config.channelId || !config.messageId) return;

		const channel = await guild.channels
			.fetch(config.channelId)
			.catch(() => null);
		if (!isChannelOfType(channel, ChannelType.GuildText)) return;
		const posted = await (channel as TextChannel).messages
			.fetch(config.messageId)
			.catch(() => null);
		if (!posted) return;

		const lang = await client.func.getLanguageData(guild.id);
		if (posted.flags.has(MessageFlags.IsComponentsV2)) {
			await posted.edit({
				components: buildTrapMessage(
					lang,
					client.iHorizon_Emojis,
					config.caughtCount ?? 0
				).components
			});
			return;
		}
		if (await sendTrapEmbed(guild, config, lang)) {
			await client.db.set(path, config);
		}
	});
}

async function ensureTrapChannel(
	guild: Guild,
	config: DatabaseStructure.HoneypotSchema,
	lang: LanguageData
): Promise<TextChannel | null> {
	if (config.channelId) {
		const existingChannel = await guild.channels
			.fetch(config.channelId)
			.catch(() => null);
		if (isChannelOfType(existingChannel, ChannelType.GuildText)) {
			return existingChannel as TextChannel;
		}
	}

	const createdChannel = await guild.channels
		.create({
			name: lang.honeypot_default_channel_name,
			type: ChannelType.GuildText,
			reason: "Honeypot automatic setup"
		})
		.catch(() => null);

	if (
		!createdChannel ||
		!isChannelOfType(createdChannel, ChannelType.GuildText)
	) {
		return null;
	}

	await createdChannel.setPosition(0).catch(() => {});
	config.channelId = createdChannel.id;
	return createdChannel;
}

// Posts (or reposts) the trap message, creating the trap channel when
// missing. Mutates `config.channelId` / `config.messageId`; the caller
// persists it (/honeypot config, dashboard).
export async function sendTrapEmbed(
	guild: Guild,
	config: DatabaseStructure.HoneypotSchema,
	lang: LanguageData
): Promise<TextChannel | null> {
	const channel = await ensureTrapChannel(guild, config, lang);

	if (!channel) {
		return null;
	}

	if (config.messageId) {
		const previousMessage = await channel.messages
			.fetch(config.messageId)
			.catch(() => null);
		await previousMessage?.delete().catch(() => {});
	}

	const sentMessage = await channel
		.send(
			buildTrapMessage(
				lang,
				guild.client.iHorizon_Emojis,
				config.caughtCount ?? 0
			)
		)
		.catch(() => null);

	if (!sentMessage) {
		return null;
	}

	config.channelId = channel.id;
	config.messageId = sentMessage.id;
	return channel;
}
