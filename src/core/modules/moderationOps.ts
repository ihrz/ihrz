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

// Effects of the moderation commands, shared by the slash/prefix commands
// and the dashboard actions (`gatewayLinkActions/moderation.ts`). Each
// function checks what the command checks and returns a refusal code; the
// command turns it into its localised message, the action into English.

import {
	AuditLogEvent,
	BaseGuildTextChannel,
	CategoryChannel,
	ChannelType,
	Collection,
	Guild,
	GuildBan,
	GuildMember,
	Message,
	MessageResolvable,
	PartialUser,
	PermissionFlagsBits,
	PermissionsBitField,
	Role,
	Snowflake,
	User
} from "discord.js";
import { LanguageData } from "../../../types/languageData.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { processBatch } from "../functions/batchProcessor.js";
import {
	getRoleRefusal,
	RoleRefusal
} from "../functions/permissonsCalculator.js";
import { ACCENT, buildCard, cardPayload } from "./uiCard.js";

export type Refused<C extends string> = { ok: false; code: C };
export type Outcome<C extends string, T = {}> = ({ ok: true } & T) | Refused<C>;

const refuse = <C extends string>(code: C): Refused<C> => ({ ok: false, code });

const isOwner = (author: GuildMember) => author.guild.ownerId === author.id;

// `author` ranks strictly above `target` (or owns the server).
const outranks = (author: GuildMember, target: GuildMember) =>
	isOwner(author) ||
	author.roles.highest.position > target.roles.highest.position;

const ihorizonLogs = (
	guild: Guild,
	embed: { title: string; description: string }
) => guild.client.func.ihorizon_logs({ guild }, embed);

/* ------------------------------- warns -------------------------------- */

const warnsKey = (guildId: string, userId: string) =>
	`${guildId}.USER.${userId}.WARNS`;

export async function getWarns(
	guild: Guild,
	userId: string
): Promise<DatabaseStructure.WarnsData[]> {
	const warns = await guild.client.db.get(warnsKey(guild.id, userId));
	return Array.isArray(warns) ? warns : [];
}

// Every member of the guild data with at least one warn (`clear-all-warns`
// walks the same object).
export async function getAllWarns(
	guild: Guild
): Promise<{ userId: string; warns: DatabaseStructure.WarnsData[] }[]> {
	const users = (await guild.client.db.get(`${guild.id}.USER`)) as Record<
		string,
		DatabaseStructure.DbGuildUserObject[string]
	> | null;
	if (!users || typeof users !== "object") return [];
	return Object.entries(users)
		.map(([userId, data]) => ({
			userId,
			warns: Array.isArray(data?.WARNS) ? data.WARNS : []
		}))
		.filter((x) => x.warns.length > 0);
}

// `/mod unwarn`: removes the warn `warnId` of `userId`.
export async function removeWarn(
	guild: Guild,
	userId: string,
	warnId: string
): Promise<
	Outcome<
		"no_warns" | "warn_not_found",
		{ removed: DatabaseStructure.WarnsData }
	>
> {
	const warns = await getWarns(guild, userId);
	if (warns.length === 0) return refuse("no_warns");
	const removed = warns.find((x) => x.id === warnId);
	if (!removed) return refuse("warn_not_found");
	await guild.client.db.set(
		warnsKey(guild.id, userId),
		warns.filter((x) => x.id !== warnId)
	);
	return { ok: true, removed };
}

// The `/mod unwarn` log: iHorizon logs channel, else a "mods" channel,
// else the moderation logs channel.
export async function sendUnwarnLog(
	guild: Guild,
	authorMention: string,
	memberMention: string,
	removed: DatabaseStructure.WarnsData,
	lang: LanguageData
): Promise<void> {
	const client = guild.client;
	const e = client.iHorizon_Emojis;
	const title = lang.unwarn_logEmbed_title;
	const description = lang.unwarn_logEmbed_desc
		.replace("${author}", authorMention)
		.replace("${member}", memberMention);

	if (client.func.hasIhorizonLogs(guild)) {
		await ihorizonLogs(guild, { title, description });
		return;
	}

	const card = buildCard({
		accent: ACCENT.success,
		emoji: e.Logs,
		title,
		description,
		fields: [
			{
				emoji: e.Warn,
				label: lang.mod_label_warn_id,
				value: `\`${removed.id}\``
			},
			{
				emoji: e.Paper,
				label: lang.var_reason,
				value: removed.reason
			}
		]
	});

	const modsChannel = guild.channels.cache.find(
		(channel) => channel.name.includes("mods") && channel.isTextBased()
	) as BaseGuildTextChannel | undefined;
	if (modsChannel) {
		await modsChannel.send(cardPayload(card)).catch(() => {});
		return;
	}

	const moderationLogsId = (await client.db.get(
		`${guild.id}.GUILD.SERVER_LOGS.moderation`
	)) as string | null;
	if (!moderationLogsId) return;
	const channel = guild.channels.cache.get(moderationLogsId) as
		BaseGuildTextChannel | undefined;
	await channel?.send(cardPayload(card)).catch(() => {});
}

// `/mod clearwarn`: deletes every warn of `userId`.
export async function clearWarns(
	guild: Guild,
	userId: string
): Promise<Outcome<"no_warns", { count: number }>> {
	const warns = await getWarns(guild, userId);
	if (warns.length === 0) return refuse("no_warns");
	await guild.client.db.delete(warnsKey(guild.id, userId));
	return { ok: true, count: warns.length };
}

/* ------------------------------- mutes -------------------------------- */

export const MAX_MUTE_MS = 4 * 7 * 24 * 60 * 60 * 1000;

// Members currently timed out (from the cache, like `/mod mutelist`),
// ending soonest first.
export function getMutedMembers(guild: Guild): GuildMember[] {
	return Array.from(
		guild.members.cache
			.filter((member) => member.isCommunicationDisabled())
			.values()
	).sort(
		(a, b) =>
			(a.communicationDisabledUntilTimestamp ?? 0) -
			(b.communicationDisabledUntilTimestamp ?? 0)
	);
}

export type TempmuteRefusal =
	| "bot_missing_permission"
	| "target_is_admin"
	| "target_above_bot"
	| "target_above_author"
	| "self"
	| "already_muted"
	| "failed";

// `/mod tempmute`: guards, timeout, log, then the warn the command adds.
// `ms` is already capped to `MAX_MUTE_MS`; `durationLabel` is what the log
// shows.
export async function tempmuteMember(
	author: GuildMember,
	target: GuildMember,
	ms: number,
	durationLabel: string,
	reason: string | null,
	lang: LanguageData
): Promise<Outcome<TempmuteRefusal, { mutedUntil: number | null }>> {
	const guild = author.guild;
	const me = guild.members.me;
	if (
		!me?.permissions.has([
			PermissionsBitField.Flags.ManageMessages,
			PermissionsBitField.Flags.MuteMembers,
			PermissionsBitField.Flags.ViewAuditLog,
			PermissionsBitField.Flags.ManageGuild
		])
	)
		return refuse("bot_missing_permission");
	if (target.permissions.has(PermissionFlagsBits.Administrator))
		return refuse("target_is_admin");
	if (
		target.roles.highest.position >= me.roles.highest.position &&
		!isOwner(author)
	)
		return refuse("target_above_bot");
	if (
		!isOwner(author) &&
		target.roles.highest.position >= author.roles.highest.position
	)
		return refuse("target_above_author");
	if (target.id === author.id) return refuse("self");
	if (target.isCommunicationDisabled()) return refuse("already_muted");

	const muted = await target
		.timeout(ms, lang.tempmute_logs_embed_title)
		.catch(() => null);
	if (!muted) return refuse("failed");

	const description = lang.tempmute_logs_embed_description
		.replace("${authorId}", author.id)
		.replace("${tomuteId}", target.id)
		.replace("${duration}", durationLabel)
		.replace("${reason}", reason || lang.var_no_set);

	await guild.client.func.ihorizon_logs(
		{ guild },
		{ title: lang.tempmute_logs_embed_title, description }
	);
	await guild.client.func.method
		.warnMember(author, target, description, lang)
		.catch(() => {});

	return { ok: true, mutedUntil: muted.communicationDisabledUntilTimestamp };
}

export type UnmuteRefusal =
	| "bot_missing_permission"
	| "self"
	| "target_above_author"
	| "not_muted"
	| "failed";

// `/mod unmute`.
export async function unmuteMember(
	author: GuildMember,
	target: GuildMember,
	lang: LanguageData
): Promise<Outcome<UnmuteRefusal>> {
	const guild = author.guild;
	if (
		!guild.members.me?.permissions.has([
			PermissionsBitField.Flags.ManageRoles
		])
	)
		return refuse("bot_missing_permission");
	if (target.id === author.id) return refuse("self");
	if (
		!isOwner(author) &&
		(target.id === guild.ownerId ||
			target.roles.highest.position >= author.roles.highest.position)
	)
		return refuse("target_above_author");
	if (!target.isCommunicationDisabled()) return refuse("not_muted");

	const done = await target
		.disableCommunicationUntil(Date.now())
		.then(() => true)
		.catch(() => false);
	if (!done) return refuse("failed");

	await ihorizonLogs(guild, {
		title: lang.unmute_logs_embed_title,
		description: lang.unmute_logs_embed_description
			.replace("${authorId}", author.id)
			.replace("${tomuteId}", target.id)
	});
	return { ok: true };
}

// `/mod unmuteall`: only members ranked below the author, like one unmute.
export async function unmuteAll(
	author: GuildMember,
	lang: LanguageData
): Promise<
	Outcome<
		"bot_missing_permission" | "nobody_muted",
		{ unmuted: number; total: number }
	>
> {
	const guild = author.guild;
	if (
		!guild.members.me?.permissions.has([
			PermissionsBitField.Flags.ManageRoles
		])
	)
		return refuse("bot_missing_permission");

	const owner = isOwner(author);
	const authorPosition = author.roles.highest.position;
	const mutedMembers = Array.from(
		guild.members.cache
			.filter(
				(member) =>
					member.isCommunicationDisabled() &&
					(owner ||
						(member.id !== guild.ownerId &&
							member.roles.highest.position < authorPosition))
			)
			.values()
	);
	if (mutedMembers.length === 0) return refuse("nobody_muted");

	let unmuted = 0;
	for (const member of mutedMembers) {
		await member
			.timeout(null, lang.unmuteall_audit_reason)
			.then(() => unmuted++)
			.catch(() => {});
	}

	await ihorizonLogs(guild, {
		title: lang.unmuteall_logs_embed_title,
		description: lang.unmuteall_logs_embed_description
			.replace("${authorId}", author.id)
			.replace("${unmuted}", unmuted.toString())
			.replace("${total}", mutedMembers.length.toString())
	});
	return { ok: true, unmuted, total: mutedMembers.length };
}

/* -------------------------------- bans -------------------------------- */

export type BanRefusal =
	| "bot_missing_permission"
	| "self"
	| "target_above_author"
	| "not_bannable"
	| "failed";

// `/mod ban`: guards, DM to the user, ban, log. `user` may have left.
export async function banUser(
	author: GuildMember,
	user: User,
	reason: string,
	lang: LanguageData
): Promise<Outcome<BanRefusal>> {
	const guild = author.guild;
	if (
		!guild.members.me?.permissions.has(PermissionsBitField.Flags.BanMembers)
	)
		return refuse("bot_missing_permission");

	const member = await guild.members.fetch(user.id).catch(() => null);
	if (user.id === author.id) return refuse("self");
	if (member) {
		if (!outranks(author, member)) return refuse("target_above_author");
		if (!member.bannable) return refuse("not_bannable");
	}

	user.send({
		content: lang.ban_message_to_the_banned_member
			.replace("${guildName}", guild.name)
			.replace("${reason}", reason)
	}).catch(() => false);

	const banned = await guild.bans
		.create(user.id, {
			reason: `Banned by: ${author.user.globalName || author.user.username} | Reason: ${reason}`
		})
		.then(() => true)
		.catch(() => false);
	if (!banned) return refuse("failed");

	await ihorizonLogs(guild, {
		title: lang.ban_logs_embed_title,
		description: lang.ban_logs_embed_description
			.replaceAll("${memberId}", user.id)
			.replaceAll("${authorId}", author.id)
	});
	return { ok: true };
}

// `/mod unban`.
export async function unbanUser(
	author: GuildMember,
	userId: string,
	reason: string,
	lang: LanguageData
): Promise<Outcome<"bot_missing_permission" | "not_banned">> {
	const guild = author.guild;
	if (
		!guild.members.me?.permissions.has([
			PermissionsBitField.Flags.BanMembers
		])
	)
		return refuse("bot_missing_permission");

	const ban = await guild.bans.fetch(userId).catch(() => null);
	if (!ban) return refuse("not_banned");

	await guild.bans.remove(userId, reason).catch(() => {});
	await ihorizonLogs(guild, {
		title: lang.unban_logs_embed_title,
		description: lang.unban_logs_embed_description
			.replaceAll("${userID}", userId)
			.replaceAll("${authorId}", author.id)
	});
	return { ok: true };
}

// `/mod baninfo`: the ban and, from the audit log, who banned and when.
export async function getBanInfo(
	guild: Guild,
	userId: string
): Promise<{
	ban: GuildBan;
	bannedAt: number | null;
	executor: User | PartialUser | null;
} | null> {
	const ban = await guild.bans.fetch(userId).catch(() => null);
	if (!ban) return null;

	const auditLogs = await guild
		.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 100 })
		.catch(() => null);
	const banLog = auditLogs?.entries.find(
		(log) =>
			log.target?.id === userId &&
			log.action === AuditLogEvent.MemberBanAdd
	);
	return {
		ban,
		bannedAt: banLog?.createdTimestamp ?? null,
		executor: banLog?.executor ?? null
	};
}

const unbanAllKey = (guildId: string) => `${guildId}.UTILS.unban_members`;

export interface BatchHooks<R> {
	// Awaited before the batch starts (progress message).
	onStart?: (total: number) => unknown;
	onDone?: (result: R) => unknown;
}

// `/unban-all all`: unbans everyone (in the background) and remembers who,
// for `undo`.
export async function unbanAll(
	guild: Guild,
	hooks: BatchHooks<{ unbanned: number; failed: number }> = {}
): Promise<Outcome<"nobody_banned", { total: number }>> {
	const bans = await guild.bans.fetch();
	if (!bans || bans.size === 0) return refuse("nobody_banned");
	await hooks.onStart?.(bans.size);

	const unbanned: string[] = [];
	let failed = 0;
	setImmediate(async () => {
		await processBatch(
			Array.from(bans.values()),
			async (ban) => {
				try {
					await guild.bans.remove(ban.user.id);
					unbanned.push(ban.user.id);
					return true;
				} catch {
					failed++;
					return false;
				}
			},
			{ batchSize: 5, delay: 200 }
		);
		await guild.client.db.set(unbanAllKey(guild.id), unbanned);
		await hooks.onDone?.({ unbanned: unbanned.length, failed });
	});
	return { ok: true, total: bans.size };
}

// `/unban-all undo`: bans again who the last `unban-all all` unbanned.
export async function undoUnbanAll(
	guild: Guild,
	hooks: BatchHooks<{ banned: number; failed: number }> = {}
): Promise<Outcome<"nothing_to_undo", { total: number }>> {
	const list: string[] | null = await guild.client.db.get(
		unbanAllKey(guild.id)
	);
	if (!list || list.length === 0) return refuse("nothing_to_undo");
	await hooks.onStart?.(list.length);

	const banned: string[] = [];
	let failed = 0;
	setImmediate(async () => {
		await processBatch(
			list,
			async (userId: string) => {
				try {
					await guild.bans.create(userId);
					banned.push(userId);
					return true;
				} catch {
					failed++;
					return false;
				}
			},
			{ batchSize: 5, delay: 200 }
		);
		await guild.client.db.set(unbanAllKey(guild.id), []);
		await hooks.onDone?.({ banned: banned.length, failed });
	});
	return { ok: true, total: list.length };
}

/* -------------------------------- kick -------------------------------- */

// `/mod kick`.
export async function kickMember(
	author: GuildMember,
	target: GuildMember,
	reason: string,
	lang: LanguageData
): Promise<
	Outcome<
		"bot_missing_permission" | "self" | "target_above_author" | "failed"
	>
> {
	const guild = author.guild;
	if (
		!guild.members.me?.permissions.has(
			PermissionsBitField.Flags.KickMembers
		)
	)
		return refuse("bot_missing_permission");
	if (target.id === author.id) return refuse("self");
	if (!outranks(author, target)) return refuse("target_above_author");

	target
		.send({
			content: lang.kick_message_to_the_banned_member
				.replaceAll("${guildName}", guild.name)
				.replaceAll("${authorUsername}", author.user.username)
		})
		.catch(() => {});

	const kicked = await target
		.kick(`Kicked by: ${author.user.username} | Reason: ${reason}`)
		.then(() => true)
		.catch(() => false);
	if (!kicked) return refuse("failed");

	await ihorizonLogs(guild, {
		title: lang.kick_logs_embed_title,
		description: lang.kick_logs_embed_description
			.replaceAll("${member}", target.user.toString())
			.replaceAll("${authorId}", author.id)
	});
	return { ok: true };
}

/* ------------------------------ messages ------------------------------ */

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_SCANNED_MESSAGES = 1000;
const FETCH_DELAY_MS = 350; // small buffer to stay clear of the messages.fetch rate limit

// Discord refuses to bulk delete messages older than two weeks.
export function keepBulkDeletable(messages: readonly Message[]): Message[] {
	const twoWeeksAgo = Date.now() - TWO_WEEKS_MS;
	return messages.filter((m) => m.createdTimestamp > twoWeeksAgo);
}

// The `targetAmount` latest messages of `authorId`, among the last 1000.
export async function findMessagesByAuthor(
	channel: BaseGuildTextChannel,
	authorId: Snowflake,
	targetAmount: number
): Promise<{ matched: Message[]; scanned: number }> {
	const matched: Message[] = [];
	let scanned = 0;
	let lastMessageId: string | undefined;

	const chunks = Math.ceil(MAX_SCANNED_MESSAGES / 100);

	for (let i = 0; i < chunks && matched.length < targetAmount; i++) {
		const fetchedMessages = await channel.messages.fetch({
			limit: 100,
			before: lastMessageId
		});

		if (fetchedMessages.size === 0) break;

		scanned += fetchedMessages.size;
		lastMessageId = fetchedMessages.last()?.id;

		for (const msg of fetchedMessages.values()) {
			if (msg.author.id !== authorId) continue;
			matched.push(msg);
			if (matched.length >= targetAmount) break;
		}

		const isLastIteration =
			i === chunks - 1 || matched.length >= targetAmount;
		if (!isLastIteration) await Bun.sleep(FETCH_DELAY_MS);
	}

	return { matched, scanned };
}

// What `/mod clear` deletes: the last `amount` messages, or the last
// `amount` of one member (null: none deletable).
export async function selectMessagesToClear(
	channel: BaseGuildTextChannel,
	amount: number,
	memberId: string | null
): Promise<number | Message[] | null> {
	if (!memberId) return Math.min(amount, 100);
	const targetAmount = Math.max(amount, 1);
	const { matched, scanned } = await findMessagesByAuthor(
		channel,
		memberId,
		targetAmount
	);
	logger.debug(
		`[clear] scanned ${scanned} message(s) to find ${matched.length}/${targetAmount} from ${memberId}`
	);
	const deletable = keepBulkDeletable(matched.slice(0, targetAmount));
	return deletable.length === 0 ? null : deletable;
}

// Bulk delete + the `/mod clear` log. Throws what Discord throws.
export async function bulkClear(
	channel: BaseGuildTextChannel,
	body:
		Collection<Snowflake, Message> | readonly MessageResolvable[] | number,
	authorId: string | undefined,
	lang: LanguageData
): Promise<number> {
	let filteredBody = body;
	if (body instanceof Collection) {
		filteredBody = body.filter((m) => keepBulkDeletable([m]).length > 0);
	}
	const messages = await channel.bulkDelete(filteredBody, true);
	await ihorizonLogs(channel.guild, {
		title: lang.clear_logs_embed_title,
		description: lang.clear_logs_embed_description
			.replace("${authorId}", String(authorId))
			.replace("${messageCount}", messages.size.toString())
			.replace("${channelId}", String(channel.id))
	});
	return messages.size;
}

/* ------------------------------ channels ------------------------------ */

// Hide/unhide the channel for `roleId` (`/channel hide|unhide`).
export async function setChannelHidden(
	channel: BaseGuildTextChannel,
	roleId: string,
	hidden: boolean
): Promise<"ok" | "unchanged" | "not_manageable" | "failed"> {
	try {
		if (!channel.manageable) return "not_manageable";
		const overwrite = channel.permissionOverwrites.cache.get(roleId);
		const isHidden = !!overwrite && overwrite.deny.has("ViewChannel");
		if (isHidden === hidden) return "unchanged";
		await channel.permissionOverwrites.edit(roleId, {
			ViewChannel: hidden ? false : null
		});
		return "ok";
	} catch {
		return "failed";
	}
}

// `/channel hideall|unhideall`: every text channel, one by one.
export async function setAllChannelsHidden(
	guild: Guild,
	roleId: string,
	hidden: boolean
): Promise<{ changed: number; errors: number }> {
	const allChannels = await guild.channels.fetch();
	let changed = 0;
	let errors = 0;
	for (const [, channel] of allChannels) {
		if (!channel || channel.type !== ChannelType.GuildText) continue;
		const result = await setChannelHidden(channel, roleId, hidden);
		if (result === "ok") changed++;
		else if (result !== "unchanged") errors++;
	}
	return { changed, errors };
}

// `/util sync`: every child of the category follows its permissions.
export async function syncCategory(
	category: CategoryChannel
): Promise<string[]> {
	const changes: string[] = [];
	for (const child of category.children.cache.values()) {
		if (!child.permissionsLocked) {
			await child.lockPermissions();
			changes.push(child.id);
		}
	}
	return changes;
}

/* -------------------------------- roles ------------------------------- */

export { getRoleRefusal };
export type { RoleRefusal };

// `/utils derank`: the roles to take, or why not.
export function derankPlan(
	author: GuildMember,
	target: GuildMember
): Outcome<"target_above_author" | "no_role", { roles: Role[] }> {
	if (!outranks(author, target)) return refuse("target_above_author");
	const roles = Array.from(target.roles.cache.values()).filter(
		(role) => role.id !== role.guild.roles.everyone.id
	);
	if (roles.length === 0) return refuse("no_role");
	return { ok: true, roles };
}

export async function derankRun(
	target: GuildMember,
	roles: Role[]
): Promise<{ removed: number; failed: number }> {
	let removed = 0;
	let failed = 0;
	await processBatch(
		roles,
		async (role) => {
			try {
				await target.roles.remove(role.id, "[Derank] Module");
				removed++;
				return true;
			} catch {
				failed++;
				return false;
			}
		},
		{ batchSize: 5, delay: 100 }
	);
	return { removed, failed };
}

export type RoleChangeRefusal =
	| "not_whitelisted"
	| "bot_not_admin"
	| "role_refused"
	| "target_above_author"
	| "admin_role"
	| "role_above_bot";

// `/utils addrole|delrole` guards.
export async function checkRoleChange(
	author: GuildMember,
	target: GuildMember,
	role: Role,
	adding: boolean
): Promise<
	| { ok: true }
	| { ok: false; code: Exclude<RoleChangeRefusal, "role_refused"> }
	| { ok: false; code: "role_refused"; refusal: RoleRefusal }
> {
	const guild = author.guild;
	const allowed: string[] =
		(await guild.client.db.get(`${guild.id}.UTILS.wlRoles`)) || [];
	if (allowed.length > 0 && !allowed.includes(role.id))
		return refuse("not_whitelisted");
	const me = guild.members.me;
	if (!me?.permissions.has(PermissionsBitField.Flags.Administrator))
		return refuse("bot_not_admin");
	const refusal = getRoleRefusal(role, author);
	if (refusal) return { ok: false, code: "role_refused", refusal };
	if (author.id !== target.id && !outranks(author, target))
		return refuse("target_above_author");
	if (
		adding &&
		role.permissions.has(PermissionFlagsBits.Administrator) &&
		!target.permissions.has(PermissionFlagsBits.Administrator)
	)
		return refuse("admin_role");
	if (me.roles.highest.position <= role.position)
		return refuse("role_above_bot");
	return { ok: true };
}

export const MASSROLE_MAX_MEMBERS = 10_000;

// `/utils massiverole`: the members to change. A role is never removed from
// someone ranked at or above the author.
export async function massRolePlan(
	author: GuildMember,
	role: Role,
	adding: boolean
): Promise<
	| { ok: true; members: GuildMember[]; skipped: number }
	| { ok: false; code: "too_many_members" }
	| { ok: false; code: "role_refused"; refusal: RoleRefusal }
> {
	const guild = author.guild;
	if (guild.memberCount >= MASSROLE_MAX_MEMBERS)
		return refuse("too_many_members");
	const refusal = getRoleRefusal(role, author);
	if (refusal) return { ok: false, code: "role_refused", refusal };

	const members = await guild.members.fetch();
	const owner = isOwner(author);
	const list = Array.from(members.values()).filter(
		(member) =>
			member.roles.cache.has(role.id) !== adding &&
			(adding ||
				owner ||
				(member.id !== guild.ownerId &&
					member.roles.highest.position <
						author.roles.highest.position))
	);
	return { ok: true, members: list, skipped: members.size - list.length };
}

export async function massRoleRun(
	members: GuildMember[],
	role: Role,
	adding: boolean
): Promise<{ changed: number; failed: number }> {
	let changed = 0;
	let failed = 0;
	await processBatch(
		members,
		async (member) => {
			try {
				if (adding) await member.roles.add(role, "[Massrole] Module");
				else await member.roles.remove(role, "[MassiveRole] Command");
				changed++;
				return true;
			} catch {
				failed++;
				return false;
			}
		},
		{ batchSize: 10, delay: 150 }
	);
	return { changed, failed };
}
