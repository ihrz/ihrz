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

// The warn system, shared by /mod warn, every automatic warn (anti-spam, tempmute…) and the dashboard
// (`gatewayLinkActions/moderation.ts`): a warn may carry a private staff note, warnings can expire after N days
// (`GUILD.WARN_CONFIG.expireDays`), and reaching a threshold applies its sanction (`GUILD.WARN_CONFIG.rules`).
// The member gets a card by private message (never the note), the staff a log card.
//
// Automatic sanctions act directly (timeout, kick, ban) instead of through moderationOps: tempmuteMember adds a
// warn itself, which could reach another threshold and loop.

import { getLogChannel } from "../functions/logChannel.js";
import {
	Guild,
	GuildBasedChannel,
	GuildMember,
	GuildTextBasedChannel,
	PermissionFlagsBits
} from "discord.js";

import { LanguageData } from "../../../types/languageData.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { generatePassword } from "../functions/random.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	cardPayload,
	CardField
} from "./uiCard.js";

type Warn = DatabaseStructure.WarnsData;
type Rule = DatabaseStructure.WarnSanctionRule;
export type WarnConfig = { expireDays: number; rules: Rule[] };

export const WARN_ACTIONS: readonly DatabaseStructure.WarnSanctionAction[] = [
	"timeout",
	"kick",
	"ban"
];
export const WARN_LIMITS = {
	rules: 10,
	count: 100,
	expireDays: 365,
	note: 500,
	reason: 1000,
	minTimeout: 60_000,
	maxTimeout: 28 * 86_400_000
} as const;
const DAY = 86_400_000;

const warnsKey = (guildId: string, userId: string) =>
	`${guildId}.USER.${userId}.WARNS`;
const configKey = (guildId: string) => `${guildId}.GUILD.WARN_CONFIG`;
const clip = (text: string, max: number) =>
	text.length > max ? `${text.slice(0, max - 1)}…` : text;

const isInt = (v: unknown): v is number =>
	typeof v === "number" && Number.isInteger(v);

/** One rule, or null when it is not one the bot can apply. */
function readRule(raw: unknown): Rule | null {
	if (!raw || typeof raw !== "object") return null;
	const r = raw as Record<string, unknown>;
	if (!isInt(r.count) || r.count < 1 || r.count > WARN_LIMITS.count)
		return null;
	if (!WARN_ACTIONS.includes(r.action as Rule["action"])) return null;
	const action = r.action as Rule["action"];
	if (action === "timeout") {
		if (
			!isInt(r.duration) ||
			r.duration < WARN_LIMITS.minTimeout ||
			r.duration > WARN_LIMITS.maxTimeout
		)
			return null;
		return { count: r.count, action, duration: r.duration };
	}
	return { count: r.count, action };
}

/** The stored settings, cleaned: unknown or broken rules are dropped, one rule per count, sorted. */
export function normalizeWarnConfig(raw: unknown): WarnConfig {
	const r =
		raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
	const expireDays =
		isInt(r.expireDays) && r.expireDays > 0
			? Math.min(r.expireDays, WARN_LIMITS.expireDays)
			: 0;
	const byCount = new Map<number, Rule>();
	for (const item of Array.isArray(r.rules) ? r.rules : []) {
		const rule = readRule(item);
		if (rule && !byCount.has(rule.count)) byCount.set(rule.count, rule);
	}
	const rules = [...byCount.values()]
		.sort((a, b) => a.count - b.count)
		.slice(0, WARN_LIMITS.rules);
	return { expireDays, rules };
}

/** Why a settings document is refused (the dashboard's check), or null. */
export function validateWarnConfig(raw: unknown): string | null {
	if (!raw || typeof raw !== "object" || Array.isArray(raw))
		return "warn settings must be an object";
	const r = raw as Record<string, unknown>;
	if (
		r.expireDays !== undefined &&
		(!isInt(r.expireDays) ||
			r.expireDays < 0 ||
			r.expireDays > WARN_LIMITS.expireDays)
	)
		return `expireDays must be an integer from 0 to ${WARN_LIMITS.expireDays}`;
	if (r.rules === undefined) return null;
	if (!Array.isArray(r.rules)) return "rules must be a list";
	if (r.rules.length > WARN_LIMITS.rules)
		return `${WARN_LIMITS.rules} rules at most`;
	const seen = new Set<number>();
	for (const item of r.rules) {
		const rule = readRule(item);
		if (!rule)
			return "a rule needs a count (1-100), an action (timeout, kick, ban) and, for a timeout, a duration from 1 minute to 28 days";
		if (seen.has(rule.count)) return "two rules share the same count";
		seen.add(rule.count);
	}
	return null;
}

export const isWarnExpired = (
	warn: Warn,
	config: WarnConfig,
	now = Date.now()
) =>
	config.expireDays > 0 &&
	(warn.timestamp ?? 0) < now - config.expireDays * DAY;

export const activeWarns = (
	warns: Warn[],
	config: WarnConfig,
	now = Date.now()
) => warns.filter((w) => !isWarnExpired(w, config, now));

/** The rule reached by exactly `count` active warnings (each threshold applies once). */
export const ruleForCount = (config: WarnConfig, count: number) =>
	config.rules.find((r) => r.count === count) ?? null;

export async function getWarnConfig(guild: Guild): Promise<WarnConfig> {
	return normalizeWarnConfig(await guild.client.db.get(configKey(guild.id)));
}

export async function setWarnConfig(
	guild: Guild,
	config: WarnConfig
): Promise<WarnConfig> {
	const clean = normalizeWarnConfig(config);
	if (clean.expireDays === 0 && clean.rules.length === 0)
		await guild.client.db.delete(configKey(guild.id));
	else await guild.client.db.set(configKey(guild.id), clean);
	return clean;
}

/** "Timeout (1h)", "Kick", "Ban". */
export function sanctionLabel(
	rule: Rule,
	lang: LanguageData,
	guild: Guild
): string {
	if (rule.action === "timeout")
		return lang.warn_sanction_timeout.replace(
			"${duration}",
			guild.client.timeCalculator.to_beautiful_string(
				rule.duration ?? 0,
				lang
			)
		);
	return rule.action === "kick"
		? lang.warn_sanction_kick
		: lang.warn_sanction_ban;
}

type SanctionOutcome = { applied: boolean; keptUntil?: number };

/** The end of a running timeout that outlasts this threshold's timeout, else null. */
export function longerTimeoutEnd(
	member: GuildMember,
	rule: Rule,
	now = Date.now()
): number | null {
	if (rule.action !== "timeout") return null;
	const until = member.communicationDisabledUntilTimestamp ?? 0;
	return until > now + (rule.duration ?? WARN_LIMITS.minTimeout)
		? until
		: null;
}

/**
 * Applies a threshold's sanction. `applied: false` when Discord or the hierarchy refuses it. A timeout never
 * shortens a longer one already running (a 2-day tempmute stays 2 days): it is kept, `keptUntil` = its end.
 */
async function applySanction(
	member: GuildMember,
	rule: Rule,
	count: number,
	lang: LanguageData
): Promise<SanctionOutcome> {
	const reason = lang.warn_auto_reason.replace("${count}", String(count));
	try {
		if (rule.action === "timeout") {
			const keptUntil = longerTimeoutEnd(member, rule);
			if (keptUntil) return { applied: true, keptUntil };
			if (!member.moderatable) return { applied: false };
			await member.timeout(
				rule.duration ?? WARN_LIMITS.minTimeout,
				reason
			);
		} else if (rule.action === "kick") {
			if (!member.kickable) return { applied: false };
			await member.kick(reason);
		} else {
			if (!member.bannable) return { applied: false };
			await member.guild.bans.create(member.id, { reason });
		}
		return { applied: true };
	} catch {
		return { applied: false };
	}
}

export type WarnRefusal = "self" | "bot" | "owner" | "above";

/**
 * Why `author` cannot warn `member` (a warn can sanction automatically: the same guards as a sanction), or null.
 * Shared by /mod warn and the dashboard (`warns.add`).
 */
export function warnRefusal(
	author: GuildMember,
	member: GuildMember
): WarnRefusal | null {
	if (member.id === author.id) return "self";
	if (member.user.bot) return "bot";
	if (member.id === member.guild.ownerId) return "owner";
	if (
		member.guild.ownerId !== author.id &&
		member.roles.highest.position >= author.roles.highest.position
	)
		return "above";
	return null;
}

export interface IssuedWarn {
	warn: Warn;
	/** Warnings that still count, this one included. */
	active: number;
	total: number;
	config: WarnConfig;
	/** `keptUntil`: a longer timeout was already running, kept as is (counts as applied). */
	sanction: { rule: Rule; applied: boolean; keptUntil?: number } | null;
}

/** The card of a new warn: the command's reply and the staff log. */
export async function warnCard(
	author: GuildMember,
	member: GuildMember,
	issued: IssuedWarn,
	lang: LanguageData
) {
	const guild = member.guild;
	const e = guild.client.iHorizon_Emojis;
	const { warn, sanction } = issued;
	const fields: CardField[] = [
		{
			emoji: e.Ticket_User,
			label: lang.utils_label_member,
			value: `${member} (\`${member.id}\`)`
		},
		{
			emoji: e.Security,
			label: lang.mod_label_moderator,
			value: author.toString()
		},
		{
			emoji: e.Paper,
			label: lang.var_reason,
			value: warn.reason || lang.var_no_set
		},
		{
			emoji: e.Warn,
			label: lang.mod_label_warn_id,
			value: `\`${warn.id}\``
		},
		{
			emoji: e.Stats,
			label: lang.warn_label_active,
			value: activeLine(issued, lang)
		}
	];
	if (warn.note)
		fields.push({
			emoji: e.Lock,
			label: lang.warn_label_note,
			value: warn.note
		});
	return buildCard({
		accent: sanction?.applied ? ACCENT.danger : ACCENT.warning,
		emoji: e.Warn,
		title: lang.warn_card_title,
		thumbnail: member.displayAvatarURL({ size: 128 }),
		fields,
		blocks: [
			sanction
				? sanctionBlock(sanction, issued.active, lang, guild)
				: null
		],
		signature: await botSignature(guild.client, guild.id)
	});
}

function activeLine(issued: IssuedWarn, lang: LanguageData): string {
	const base = `**${issued.active}**`;
	return issued.config.expireDays > 0
		? // Subtext only renders at the start of a line.
			`${base}\n-# ${lang.warn_expire_note.replace("${days}", String(issued.config.expireDays))}`
		: base;
}

function sanctionBlock(
	sanction: NonNullable<IssuedWarn["sanction"]>,
	count: number,
	lang: LanguageData,
	guild: Guild
) {
	const e = guild.client.iHorizon_Emojis;
	const label = sanctionLabel(sanction.rule, lang, guild);
	if (sanction.applied && sanction.keptUntil)
		return `${e.Warning_Icon} **${lang.warn_label_sanction}** : ${lang.warn_sanction_kept
			.replace("${sanction}", label)
			.replace(
				"${until}",
				`<t:${Math.floor(sanction.keptUntil / 1000)}:f>`
			)}`;
	return sanction.applied
		? `${e.Ban_Hammer} **${lang.warn_label_sanction}** : ${label} · ${lang.warn_auto_reason.replace("${count}", String(count))}`
		: `${e.Warning_Icon} **${lang.warn_label_sanction}** : ${lang.warn_sanction_failed.replace("${sanction}", label)}`;
}

/** The private message to the warned member (no staff note). */
async function sendWarnDm(
	author: GuildMember,
	member: GuildMember,
	issued: IssuedWarn,
	lang: LanguageData
) {
	const guild = member.guild;
	const e = guild.client.iHorizon_Emojis;
	const at = Math.floor(issued.warn.timestamp / 1000);
	const card = buildCard({
		accent: ACCENT.warning,
		emoji: e.Warn,
		title: lang.warn_dm_title,
		description: `**${guild.name}**`,
		thumbnail: guild.iconURL({ size: 128 }),
		fields: [
			{
				emoji: e.Paper,
				label: lang.var_reason,
				value: issued.warn.reason || lang.var_no_set
			},
			{
				emoji: e.Security,
				label: lang.mod_label_moderator,
				value: author.user.username
			},
			{
				emoji: e.Schedule,
				label: lang.warn_label_date,
				value: `<t:${at}:f>`
			},
			{
				emoji: e.Warn,
				label: lang.mod_label_warn_id,
				value: `\`${issued.warn.id}\``
			},
			{
				emoji: e.Stats,
				label: lang.warn_label_active,
				value: activeLine(issued, lang)
			}
		],
		blocks: [
			// Sent BEFORE the sanction (a kicked or banned member can't be
			// reached afterwards): announce the sanction the rule applies.
			issued.sanction
				? sanctionBlock(
						{ ...issued.sanction, applied: true },
						issued.active,
						lang,
						guild
					)
				: null
		],
		signature: await botSignature(guild.client, guild.id)
	});
	await member.send(cardPayload(card)).catch(() => null);
}

/**
 * Only @everyone-hidden channels are picked by name: a public "mods" (or "ihorizon-logs") channel would show the
 * staff notes to everyone.
 */
export function isStaffOnlyChannel(channel: GuildBasedChannel): boolean {
	const everyone = channel.guild.roles.everyone;
	const perms = channel.permissionsFor(everyone);
	return !!perms && !perms.has(PermissionFlagsBits.ViewChannel);
}

/**
 * Sends a staff log card: the iHorizon logs channel, else a "mods" channel (both only when @everyone cannot see
 * them), else the moderation logs channel chosen with /setlogs. Shared by the warn, clearwarn and clear-all-warns
 * logs. True when a channel took it.
 */
export async function sendStaffLog(
	guild: Guild,
	payload: ReturnType<typeof cardPayload>
): Promise<boolean> {
	const sendTo = async (
		channel: GuildTextBasedChannel | null | undefined
	) => {
		if (!channel || !channel.isTextBased()) return false;
		return channel.send(payload).then(
			() => true,
			() => false
		);
	};
	const byName = (part: string) =>
		guild.channels.cache.find(
			(c) =>
				c.name.includes(part) &&
				c.isTextBased() &&
				isStaffOnlyChannel(c)
		) as GuildTextBasedChannel | undefined;
	if (guild.client.func.hasIhorizonLogs(guild)) {
		if (await sendTo(byName("ihorizon-logs"))) return true;
	}
	if (await sendTo(byName("mods"))) return true;
	return sendTo(await getLogChannel(guild, "moderation"));
}

async function sendWarnLog(
	author: GuildMember,
	member: GuildMember,
	issued: IssuedWarn,
	lang: LanguageData
) {
	await sendStaffLog(
		member.guild,
		cardPayload(await warnCard(author, member, issued, lang))
	);
}

/**
 * The log of /mod clearwarn (`member` given) and /mod clear-all-warns (`members` = how many members had
 * warnings), also used by the dashboard's clear action.
 */
export async function sendWarnsClearedLog(
	guild: Guild,
	authorMention: string,
	cleared: { count: number } & (
		| { member: string; members?: undefined }
		| { members: number; member?: undefined }
	),
	lang: LanguageData
): Promise<boolean> {
	const e = guild.client.iHorizon_Emojis;
	const card = buildCard({
		accent: ACCENT.success,
		emoji: e.Logs,
		title:
			cleared.member !== undefined
				? lang.clearwarn_card_title
				: lang.clear_allwarns_card_title,
		description:
			cleared.member !== undefined
				? lang.clearwarn_card_desc
						.replace("${count}", String(cleared.count))
						.replace("${member}", cleared.member)
				: lang.clear_allwarns_log_desc
						.replace("${count}", String(cleared.count))
						.replace("${members}", String(cleared.members)),
		fields: [
			{
				emoji: e.Security,
				label: lang.mod_label_moderator,
				value: authorMention
			}
		],
		signature: await botSignature(guild.client, guild.id)
	});
	return sendStaffLog(guild, cardPayload(card)).catch(() => false);
}

/**
 * Adds a warn (with an optional staff note), tells the member, applies the threshold's sanction if one is
 * reached, logs it. Every warn goes through here (commands, dashboard, automatic moderation).
 */
export async function issueWarn(
	author: GuildMember,
	member: GuildMember,
	reason: string,
	lang: LanguageData,
	note?: string | null
): Promise<IssuedWarn> {
	const guild = member.guild;
	const warn: Warn = {
		timestamp: Date.now(),
		reason: clip(reason, WARN_LIMITS.reason),
		authorID: author.user.id,
		id: generatePassword({ length: 8, lowercase: false, numbers: true })
	};
	const cleanNote = note?.trim();
	if (cleanNote) warn.note = clip(cleanNote, WARN_LIMITS.note);

	await guild.client.db.push(warnsKey(guild.id, member.id), warn);
	const [stored, config] = await Promise.all([
		guild.client.db.get(warnsKey(guild.id, member.id)),
		getWarnConfig(guild)
	]);
	const warns: Warn[] = Array.isArray(stored) ? stored : [warn];
	const active = activeWarns(warns, config).length;
	const rule = ruleForCount(config, active);
	const issued: IssuedWarn = {
		warn,
		active,
		total: warns.length,
		config,
		sanction: rule ? { rule, applied: false } : null
	};
	// The DM announces what will happen: a longer running timeout is kept.
	const keptUntil = rule ? longerTimeoutEnd(member, rule) : null;
	if (issued.sanction && keptUntil) issued.sanction.keptUntil = keptUntil;

	// Before a kick or a ban: afterwards the member can no longer be reached.
	await sendWarnDm(author, member, issued, lang).catch(() => {});
	if (rule)
		issued.sanction = {
			rule,
			...(await applySanction(member, rule, active, lang))
		};
	await sendWarnLog(author, member, issued, lang).catch(() => {});
	return issued;
}
