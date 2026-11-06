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

/*
 * Anti-spam engine.
 *
 * Per message, the hot path is synchronous once the guild config is cached:
 * no DB read, no language load, O(recent messages of that author).
 *
 * Detection, derived from the guild options (`maxInterval`, `Threshold`):
 *   - burst: more than `Threshold` messages within `Threshold * maxInterval`
 *     (an average gap below `maxInterval`, robust to jittered timings);
 *   - duplicates: the same content more than `Threshold` times within four
 *     times that window, which catches slow cross-channel spam that stays under the rate.
 *
 * A spammer is punished immediately (no debounce a raid could keep resetting),
 * once per cooldown; their burst and any message sent during the cooldown are
 * bulk deleted per channel. Warnings and logs are grouped per guild.
 */

import {
	BaseGuildTextChannel,
	EmbedBuilder,
	GuildMember,
	Message,
	PermissionFlagsBits
} from "discord.js";

import { AntiSpam } from "../../../types/antispam.js";
import { LanguageData } from "../../../types/languageData.js";

interface TrackedMessage {
	id: string;
	channelId: string;
	at: number;
	fingerprint: string | null;
}

interface AuthorState {
	messages: TrackedMessage[];
	punishedUntil: number;
}

interface PendingReport {
	channel: BaseGuildTextChannel;
	members: Map<string, GuildMember>;
	options: AntiSpam.AntiSpamOptions;
}

const CONFIG_TTL_MS = 10_000;
const DUPLICATE_WINDOW_FACTOR = 4;
const PUNISH_COOLDOWN_MS = 10_000;
const DELETE_FLUSH_MS = 500;
const REPORT_FLUSH_MS = 2_000;
const WARNING_LIFETIME_MS = 4_000;
const SANCTION_DECAY_MS = 24 * 60 * 60 * 1000;
const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60_000;

const configs = new Map<
	string,
	{ value: Promise<AntiSpam.AntiSpamOptions | null>; expiresAt: number }
>();
// guild -> author -> recent activity
const authors = new Map<string, Map<string, AuthorState>>();
// guild:member -> escalation of the mute duration
const sanctions = new Map<string, { count: number; at: number }>();
// guild -> channel -> message ids waiting for a bulk delete
const pendingDeletes = new Map<string, Map<string, Set<string>>>();
const pendingReports = new Map<string, PendingReport>();

setInterval(() => {
	const now = Date.now();
	for (const [guildId, guildAuthors] of authors) {
		for (const [authorId, state] of guildAuthors) {
			const last = state.messages[state.messages.length - 1];
			if (
				(!last || now - last.at > 5 * 60_000) &&
				state.punishedUntil < now
			)
				guildAuthors.delete(authorId);
		}
		if (guildAuthors.size === 0) authors.delete(guildId);
	}
	for (const [key, sanction] of sanctions) {
		if (now - sanction.at > SANCTION_DECAY_MS) sanctions.delete(key);
	}
	for (const [guildId, config] of configs) {
		if (config.expiresAt <= now) configs.delete(guildId);
	}
}, SWEEP_INTERVAL_MS).unref();

/* ------------------------------------------------------------------ */
/* Config                                                             */
/* ------------------------------------------------------------------ */

/** /antispam's defaults, for what a config leaves out or sets to nothing: an
 * undefined threshold makes every comparison false, so nothing is ever detected. */
function withDefaults(
	options: AntiSpam.AntiSpamOptions | null
): AntiSpam.AntiSpamOptions | null {
	if (!options) return null;
	const positive = (v: unknown, fallback: number) =>
		typeof v === "number" && v > 0 ? v : fallback;
	return {
		...options,
		Threshold: positive(options.Threshold, 3),
		maxInterval: positive(options.maxInterval, 1900),
		punishTime: positive(options.punishTime, 15 * 60 * 1000),
		punishment_type: options.punishment_type || "mute"
	};
}

function getOptions(guildId: string): Promise<AntiSpam.AntiSpamOptions | null> {
	const cached = configs.get(guildId);
	if (cached && cached.expiresAt > Date.now()) return cached.value;

	const value = (
		client.db.get(
			`${guildId}.GUILD.ANTISPAM`
		) as Promise<AntiSpam.AntiSpamOptions | null>
	)
		.then(withDefaults)
		.catch(() => null);
	configs.set(guildId, { value, expiresAt: Date.now() + CONFIG_TTL_MS });
	return value;
}

/** Drops the cached options so the next message reads the fresh ones. */
export function invalidateAntiSpamConfig(guildId: string): void {
	configs.delete(guildId);
}

function isExempt(message: Message<true>, options: AntiSpam.AntiSpamOptions) {
	if (!options.Enabled) return true;
	if (options.ignoreBots && message.author.bot) return true;

	const member = message.member;
	if (member?.permissions.has(PermissionFlagsBits.Administrator)) return true;
	if (options.BYPASS_ROLES?.some((id) => member?.roles.cache.has(id)))
		return true;

	const bypass = options.BYPASS_CHANNELS;
	if (!bypass?.length) return false;
	const channel = message.channel;
	// A thread inherits the bypass of its channel and of that channel's category.
	const parent = channel.isThread() ? channel.parent : null;
	return [channel.id, channel.parentId, parent?.parentId].some(
		(id) => !!id && bypass.includes(id)
	);
}

/* ------------------------------------------------------------------ */
/* Detection                                                          */
/* ------------------------------------------------------------------ */

function fingerprintOf(message: Message): string | null {
	const content = message.content.trim().toLowerCase().replace(/\s+/g, " ");
	const attachments = message.attachments.map((a) => a.size).join(",");
	const stickers = message.stickers.map((s) => s.id).join(",");
	if (!content && !attachments && !stickers) return null;
	return Bun.hash(`${content}|${attachments}|${stickers}`).toString(36);
}

function stateOf(guildId: string, authorId: string): AuthorState {
	let guildAuthors = authors.get(guildId);
	if (!guildAuthors) {
		guildAuthors = new Map();
		authors.set(guildId, guildAuthors);
	}
	let state = guildAuthors.get(authorId);
	if (!state) {
		state = { messages: [], punishedUntil: 0 };
		guildAuthors.set(authorId, state);
	}
	return state;
}

function isSpamming(
	state: AuthorState,
	current: TrackedMessage,
	options: AntiSpam.AntiSpamOptions
): boolean {
	const threshold = Math.max(1, options.Threshold);
	const rateWindow = options.maxInterval * threshold;

	let recent = 0;
	let duplicates = 0;
	for (const tracked of state.messages) {
		if (current.at - tracked.at <= rateWindow) recent++;
		if (current.fingerprint && tracked.fingerprint === current.fingerprint)
			duplicates++;
	}

	// `current` is not tracked yet: these counts exclude it.
	return recent >= threshold || duplicates >= threshold;
}

/* ------------------------------------------------------------------ */
/* Actions                                                            */
/* ------------------------------------------------------------------ */

function queueDelete(guildId: string, messages: TrackedMessage[]): void {
	if (messages.length === 0) return;

	let channels = pendingDeletes.get(guildId);
	const scheduleFlush = !channels;
	if (!channels) {
		channels = new Map();
		pendingDeletes.set(guildId, channels);
	}
	for (const message of messages) {
		let ids = channels.get(message.channelId);
		if (!ids) {
			ids = new Set();
			channels.set(message.channelId, ids);
		}
		ids.add(message.id);
	}

	// Fixed delay (never reset): groups a burst into one bulk delete per channel.
	if (scheduleFlush) setTimeout(() => flushDeletes(guildId), DELETE_FLUSH_MS);
}

async function flushDeletes(guildId: string): Promise<void> {
	const channels = pendingDeletes.get(guildId);
	pendingDeletes.delete(guildId);
	const guild = client.guilds.cache.get(guildId);
	if (!channels || !guild) return;

	await Promise.allSettled(
		[...channels].map(async ([channelId, ids]) => {
			const channel = guild.channels.cache.get(channelId);
			if (!channel?.isTextBased()) return;
			const all = [...ids];
			for (let i = 0; i < all.length; i += 100) {
				await channel.bulkDelete(all.slice(i, i + 100), true);
			}
		})
	);
}

async function punish(
	member: GuildMember,
	options: AntiSpam.AntiSpamOptions,
	lang: LanguageData
): Promise<boolean> {
	switch (options.punishment_type) {
		case "mute": {
			if (!member.moderatable) return false;
			const key = `${member.guild.id}:${member.id}`;
			const previous = sanctions.get(key);
			const count = (previous?.count ?? 0) + 1;
			sanctions.set(key, { count, at: Date.now() });

			// Each new antispam sanction doubles the mute duration.
			const duration = Math.min(
				options.punishTime * 2 ** (count - 1),
				MAX_TIMEOUT_MS
			);
			await member.timeout(duration, "Spamming");
			await client.func.method
				.warnMember(
					member.guild.members.me!,
					member,
					"Antispam Punishment",
					lang
				)
				.catch(() => {});
			return true;
		}
		case "kick":
			if (!member.kickable) return false;
			await member.kick("Spamming!");
			return true;
		case "ban":
			if (!member.bannable) return false;
			await member.ban({ reason: "Spamming!" });
			return true;
		default:
			return false;
	}
}

function queueReport(
	message: Message<true>,
	member: GuildMember,
	options: AntiSpam.AntiSpamOptions
): void {
	const guildId = message.guildId;
	const pending = pendingReports.get(guildId);
	if (pending) {
		pending.members.set(member.id, member);
		return;
	}
	pendingReports.set(guildId, {
		channel: message.channel as BaseGuildTextChannel,
		members: new Map([[member.id, member]]),
		options
	});
	setTimeout(() => {
		flushReport(guildId).catch(() => {});
	}, REPORT_FLUSH_MS);
}

async function flushReport(guildId: string): Promise<void> {
	const report = pendingReports.get(guildId);
	pendingReports.delete(guildId);
	if (!report || report.members.size === 0) return;

	const lang = await client.func.getLanguageData(guildId);
	const members = [...report.members.values()];
	const mentions = members.map((member) => member.toString()).join(", ");

	let warning = lang.antispam_base_warn_message.replace(
		"${mentionedMembers}",
		mentions
	);
	switch (report.options.punishment_type) {
		case "mute":
			warning += lang.antispam_more_mute_msg;
			break;
		case "kick":
			warning += lang.antispam_more_kick_msg;
			break;
		case "ban":
			warning += lang.antispam_more_ban_msg;
			break;
	}

	report.channel
		.send(warning)
		.then((sent) => {
			setTimeout(
				() => sent.delete().catch(() => {}),
				WARNING_LIFETIME_MS
			);
		})
		.catch(() => {});

	const logsChannelId = (await client.db.get(
		`${guildId}.GUILD.SERVER_LOGS.antispam`
	)) as string | null;
	const logsChannel = logsChannelId
		? report.channel.guild.channels.cache.get(logsChannelId)
		: undefined;
	if (!logsChannel?.isTextBased()) return;

	const embed = new EmbedBuilder()
		.setColor("#e4433f")
		.setTimestamp()
		.setTitle(
			lang.antispam_log_embed_title.replace(
				"${actionType}",
				report.options.punishment_type
			)
		)
		.setDescription(
			lang.antispam_log_embed_desc
				.replace("${bot}", client.user!.toString())
				.replace("${actionType}", "sanction")
				.replace("${user}", mentions)
		);
	await logsChannel.send({ embeds: [embed] }).catch(() => {});
}

/* ------------------------------------------------------------------ */
/* Entry point                                                        */
/* ------------------------------------------------------------------ */

export async function handleAntiSpamMessage(message: Message): Promise<void> {
	if (!message.inGuild() || message.webhookId) return;
	const guild = message.guild;
	if (
		message.author.id === client.user?.id ||
		message.author.id === guild.ownerId ||
		!guild.members.me?.permissions.has(PermissionFlagsBits.Administrator)
	)
		return;

	const options = await getOptions(guild.id);
	if (!options || isExempt(message, options)) return;

	const now = Date.now();
	const retention =
		options.maxInterval *
		Math.max(1, options.Threshold) *
		DUPLICATE_WINDOW_FACTOR;
	const state = stateOf(guild.id, message.author.id);
	while (state.messages.length && now - state.messages[0].at > retention) {
		state.messages.shift();
	}

	const current: TrackedMessage = {
		id: message.id,
		channelId: message.channelId,
		at: message.createdTimestamp,
		fingerprint: fingerprintOf(message)
	};

	// Already handled: only clean up what keeps coming during the cooldown.
	if (state.punishedUntil > now) {
		if (options.removeMessages) queueDelete(guild.id, [current]);
		return;
	}

	const spamming = isSpamming(state, current, options);
	state.messages.push(current);
	if (!spamming) return;

	state.punishedUntil = now + PUNISH_COOLDOWN_MS;
	if (options.removeMessages) queueDelete(guild.id, state.messages);
	state.messages = [];

	const member =
		message.member ??
		(await guild.members.fetch(message.author.id).catch(() => null));
	if (!member) return;

	const lang = await client.func.getLanguageData(guild.id);
	const punished = await punish(member, options, lang).catch(() => false);
	if (punished) queueReport(message, member, options);
}
