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
 * Protection engine.
 *
 * Driven by the `guildAuditLogEntryCreate` gateway event: Discord pushes every
 * audit log entry (executor included) in real time, so no REST audit log fetch
 * is needed before reacting. For each entry:
 *   1. the guild config (PROTECTION + ALLOWLIST + OWNER) is read once and
 *      cached for a few seconds, so a mass action costs one DB round trip;
 *   2. the sanction and the restoration run in parallel;
 *   3. an executor is sanctioned once per burst (escalating only when a more
 *      severe rule is broken), every one of their actions is still reverted;
 *   4. updates are reverted from the entry's own `old` values (one PATCH),
 *      deletions are rebuilt from snapshots captured by the delete events,
 *      with parent categories / roles remapped to their recreated ids.
 */

import {
	AuditLogEvent,
	AuditLogOptionsType,
	Guild,
	GuildAuditLogsEntry,
	GuildMember,
	NonThreadGuildBasedChannel,
	OverwriteType,
	PermissionFlagsBits,
	Role,
	Routes,
	type APIOverwrite,
	type RESTPostAPIGuildChannelJSONBody,
	type RESTPostAPIGuildRoleJSONBody
} from "discord.js";

import { DatabaseStructure } from "../../../types/database_structure.js";

type ProtectionRuleKey =
	| "webhook"
	| "updateguild"
	| "createchannel"
	| "updatechannel"
	| "deletechannel"
	| "createrole"
	| "deleterole"
	| "updaterole"
	| "updatemember"
	| "banmembers"
	| "kickmember"
	| "unbanmembers"
	| "add_admin_roles";

type AuditChange = { key: string; old?: unknown; new?: unknown };
type RawBody = Record<string, unknown>;

interface ProtectionContext {
	protection: DatabaseStructure.ProtectionData;
	allowlist: NonNullable<DatabaseStructure.AllowListData["list"]>;
	owners: DatabaseStructure.OwnerSchema;
}

interface DeletedChannelSnapshot {
	body: RawBody;
	parentId: string | null;
	overwrites: APIOverwrite[];
}

interface RoleIndex {
	members: Map<string, string[]>;
	overwrites: Map<string, DeletedRoleSnapshot["overwrites"]>;
}

interface DeletedRoleSnapshot {
	body: RawBody;
	iconHash: string | null;
	rawPosition: number;
	memberIds: string[];
	overwrites: { channelId: string; allow: string; deny: string }[];
}

// When several rules match one entry, the first one decides the sanction.
const RULES_BY_ACTION: Partial<Record<AuditLogEvent, ProtectionRuleKey[]>> = {
	[AuditLogEvent.GuildUpdate]: ["updateguild"],
	[AuditLogEvent.ChannelCreate]: ["createchannel"],
	[AuditLogEvent.ChannelUpdate]: ["updatechannel"],
	[AuditLogEvent.ChannelOverwriteCreate]: ["updatechannel"],
	[AuditLogEvent.ChannelOverwriteUpdate]: ["updatechannel"],
	[AuditLogEvent.ChannelOverwriteDelete]: ["updatechannel"],
	[AuditLogEvent.ChannelDelete]: ["deletechannel"],
	[AuditLogEvent.RoleCreate]: ["add_admin_roles", "createrole"],
	[AuditLogEvent.RoleUpdate]: ["add_admin_roles", "updaterole"],
	[AuditLogEvent.RoleDelete]: ["deleterole"],
	[AuditLogEvent.MemberRoleUpdate]: ["add_admin_roles", "updatemember"],
	[AuditLogEvent.MemberBanAdd]: ["banmembers"],
	[AuditLogEvent.MemberBanRemove]: ["unbanmembers"],
	[AuditLogEvent.MemberKick]: ["kickmember"],
	[AuditLogEvent.MemberPrune]: ["kickmember"],
	[AuditLogEvent.WebhookCreate]: ["webhook"],
	[AuditLogEvent.WebhookUpdate]: ["webhook"],
	[AuditLogEvent.WebhookDelete]: ["webhook"]
};

const SANCTION_SEVERITY: Record<string, number> = {
	simply: 0,
	"simply+mute": 1,
	"simply+derank": 2,
	"simply+kick": 3,
	"simply+ban": 4
};

// Raw API keys an audit entry may carry that can be PATCHed back as-is.
const CHANNEL_KEYS = new Set([
	"name",
	"type",
	"topic",
	"nsfw",
	"position",
	"parent_id",
	"rate_limit_per_user",
	"bitrate",
	"user_limit",
	"rtc_region",
	"video_quality_mode",
	"default_auto_archive_duration",
	"default_thread_rate_limit_per_user",
	"available_tags",
	"default_reaction_emoji",
	"default_sort_order",
	"default_forum_layout",
	"flags"
]);
const ROLE_KEYS = new Set([
	"name",
	"permissions",
	"color",
	"colors",
	"hoist",
	"mentionable",
	"unicode_emoji"
]);
const GUILD_KEYS = new Set([
	"name",
	"description",
	"afk_channel_id",
	"afk_timeout",
	"system_channel_id",
	"system_channel_flags",
	"rules_channel_id",
	"public_updates_channel_id",
	"safety_alerts_channel_id",
	"verification_level",
	"default_message_notifications",
	"explicit_content_filter",
	"preferred_locale",
	"premium_progress_bar_enabled"
]);
const WEBHOOK_KEYS = new Set(["name", "channel_id"]);

const CONTEXT_TTL_MS = 5_000;
const SANCTION_MEMORY_MS = 60_000;
const SNAPSHOT_TTL_MS = 60_000;
const SNAPSHOT_WAIT_MS = 2_000;
const REMAP_WAIT_MS = 3_000;
const SWEEP_INTERVAL_MS = 60_000;
// Reused by every role deleted in the same burst (see roleIndexOf).
const ROLE_INDEX_TTL_MS = 10_000;
// Max parallel bulk requests (member role re-adds, overwrites) per guild,
// so one restore can never monopolise the bot-wide REST rate limit.
const BULK_CONCURRENCY = 4;

/**
 * Map whose entries expire, with the ability to wait for a key that has not
 * been written yet (gateway events and audit entries can arrive in any order).
 */
class ExpiringStore<T> {
	private readonly entries = new Map<
		string,
		{ value: T; expiresAt: number }
	>();
	private readonly waiters = new Map<string, Set<(value: T) => void>>();

	constructor(private readonly ttlMs: number) {}

	set(key: string, value: T): void {
		this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
		const waiting = this.waiters.get(key);
		if (!waiting) return;
		this.waiters.delete(key);
		for (const resolve of waiting) resolve(value);
	}

	get(key: string): T | undefined {
		const entry = this.entries.get(key);
		if (!entry) return undefined;
		if (entry.expiresAt <= Date.now()) {
			this.entries.delete(key);
			return undefined;
		}
		return entry.value;
	}

	has(key: string): boolean {
		return this.get(key) !== undefined;
	}

	delete(key: string): void {
		this.entries.delete(key);
	}

	wait(key: string, timeoutMs: number): Promise<T | undefined> {
		const current = this.get(key);
		if (current !== undefined) return Promise.resolve(current);

		return new Promise((resolve) => {
			let waiting = this.waiters.get(key);
			if (!waiting) {
				waiting = new Set();
				this.waiters.set(key, waiting);
			}
			const done = (value: T | undefined) => {
				clearTimeout(timer);
				waiting.delete(done);
				if (waiting.size === 0 && this.waiters.get(key) === waiting) {
					this.waiters.delete(key);
				}
				resolve(value);
			};
			const timer = setTimeout(() => done(undefined), timeoutMs);
			waiting.add(done);
		});
	}

	sweep(now: number): void {
		for (const [key, entry] of this.entries) {
			if (entry.expiresAt <= now) this.entries.delete(key);
		}
	}
}

const contexts = new ExpiringStore<Promise<ProtectionContext | null>>(
	CONTEXT_TTL_MS
);
const sanctions = new ExpiringStore<number>(SANCTION_MEMORY_MS);
const deletedChannels = new ExpiringStore<DeletedChannelSnapshot>(
	SNAPSHOT_TTL_MS
);
const deletedRoles = new ExpiringStore<DeletedRoleSnapshot>(SNAPSHOT_TTL_MS);
// Category id -> channels Discord moved out of it when it was deleted.
const orphans = new ExpiringStore<Set<string>>(SNAPSHOT_TTL_MS);
// Deleted channel/role id -> id of its recreation (null when it failed).
const recreated = new ExpiringStore<string | null>(SNAPSHOT_TTL_MS);
const restoring = new ExpiringStore<true>(SNAPSHOT_TTL_MS);
const roleIndexes = new ExpiringStore<RoleIndex>(ROLE_INDEX_TTL_MS);

setInterval(() => {
	const now = Date.now();
	for (const store of [
		contexts,
		sanctions,
		deletedChannels,
		deletedRoles,
		orphans,
		recreated,
		restoring,
		roleIndexes
	]) {
		store.sweep(now);
	}
}, SWEEP_INTERVAL_MS).unref();

const keyOf = (guildId: string, id: string) => `${guildId}:${id}`;

/* ------------------------------------------------------------------ */
/* Config                                                             */
/* ------------------------------------------------------------------ */

async function fetchContext(
	guildId: string
): Promise<ProtectionContext | null> {
	// One round trip: the first entry of a raid is the one that matters.
	const [protection, allowlist, owners] = (await Promise.all([
		client.db.get(`${guildId}.PROTECTION`),
		client.db.get(`${guildId}.ALLOWLIST.list`),
		client.db.get(`${guildId}.OWNER`)
	])) as [
		DatabaseStructure.ProtectionData | null,
		DatabaseStructure.AllowListData["list"] | null,
		DatabaseStructure.OwnerSchema | null
	];
	if (!protection) return null;

	return { protection, allowlist: allowlist || {}, owners: owners || {} };
}

function getContext(guildId: string): Promise<ProtectionContext | null> {
	let context = contexts.get(guildId);
	if (!context) {
		context = fetchContext(guildId).catch(() => null);
		contexts.set(guildId, context);
	}
	return context;
}

/** Drops the cached config so the next entry reads the fresh one. */
export function invalidateProtectionContext(guildId: string): void {
	contexts.delete(guildId);
}

/* ------------------------------------------------------------------ */
/* Snapshots (fed by the delete / update gateway events)              */
/* ------------------------------------------------------------------ */

function assign(body: RawBody, key: string, value: unknown): void {
	if (value !== null && value !== undefined) body[key] = value;
}

// discord.js keeps a member's raw role ids even after the role is removed from
// the guild cache, which is the only way to know who held a deleted role.
function rawRoleIds(member: GuildMember): string[] {
	return (member as unknown as { _roles: string[] })._roles;
}

export function rememberDeletedChannel(
	channel: NonThreadGuildBasedChannel
): void {
	const body: RawBody = {
		name: channel.name,
		type: channel.type,
		position: channel.rawPosition
	};

	if ("topic" in channel) assign(body, "topic", channel.topic);
	if ("nsfw" in channel) assign(body, "nsfw", channel.nsfw);
	if ("rateLimitPerUser" in channel)
		assign(body, "rate_limit_per_user", channel.rateLimitPerUser);
	if ("bitrate" in channel) assign(body, "bitrate", channel.bitrate);
	if ("userLimit" in channel) assign(body, "user_limit", channel.userLimit);
	if ("rtcRegion" in channel) assign(body, "rtc_region", channel.rtcRegion);
	if ("videoQualityMode" in channel)
		assign(body, "video_quality_mode", channel.videoQualityMode);
	if ("defaultAutoArchiveDuration" in channel)
		assign(
			body,
			"default_auto_archive_duration",
			channel.defaultAutoArchiveDuration
		);
	if ("defaultThreadRateLimitPerUser" in channel)
		assign(
			body,
			"default_thread_rate_limit_per_user",
			channel.defaultThreadRateLimitPerUser
		);
	if ("availableTags" in channel)
		body.available_tags = channel.availableTags.map((tag) => ({
			name: tag.name,
			moderated: tag.moderated,
			emoji_id: tag.emoji?.id ?? null,
			emoji_name: tag.emoji?.name ?? null
		}));
	if ("defaultReactionEmoji" in channel && channel.defaultReactionEmoji)
		body.default_reaction_emoji = {
			emoji_id: channel.defaultReactionEmoji.id,
			emoji_name: channel.defaultReactionEmoji.name
		};
	if ("defaultSortOrder" in channel)
		assign(body, "default_sort_order", channel.defaultSortOrder);
	if ("defaultForumLayout" in channel)
		assign(body, "default_forum_layout", channel.defaultForumLayout);

	const guildId = channel.guild.id;
	deletedChannels.set(keyOf(guildId, channel.id), {
		body,
		parentId: channel.parentId,
		overwrites: channel.permissionOverwrites.cache.map((overwrite) => ({
			id: overwrite.id,
			type: overwrite.type,
			allow: overwrite.allow.bitfield.toString(),
			deny: overwrite.deny.bitfield.toString()
		}))
	});

	for (const child of channel.guild.channels.cache.values()) {
		if (child.parentId === channel.id) {
			rememberOrphan(guildId, channel.id, child.id);
		}
	}
}

/** Records a channel that left a category, in case that category is being deleted. */
export function rememberOrphan(
	guildId: string,
	categoryId: string,
	channelId: string
): void {
	const key = keyOf(guildId, categoryId);
	const children = orphans.get(key) ?? new Set<string>();
	children.add(channelId);
	orphans.set(key, children);
}

/**
 * Role id -> holders and channel overwrites, built in a single pass over the
 * guild caches. A mass role deletion reuses it instead of scanning every
 * member once per role, which would block the shard in big guilds.
 */
function roleIndexOf(guild: Guild): RoleIndex {
	const cached = roleIndexes.get(guild.id);
	if (cached) return cached;

	const index: RoleIndex = { members: new Map(), overwrites: new Map() };
	for (const member of guild.members.cache.values()) {
		for (const roleId of rawRoleIds(member)) {
			const holders = index.members.get(roleId);
			if (holders) holders.push(member.id);
			else index.members.set(roleId, [member.id]);
		}
	}
	for (const channel of guild.channels.cache.values()) {
		if (!("permissionOverwrites" in channel)) continue;
		for (const overwrite of channel.permissionOverwrites.cache.values()) {
			if (overwrite.type !== OverwriteType.Role) continue;
			const entry = {
				channelId: channel.id,
				allow: overwrite.allow.bitfield.toString(),
				deny: overwrite.deny.bitfield.toString()
			};
			const list = index.overwrites.get(overwrite.id);
			if (list) list.push(entry);
			else index.overwrites.set(overwrite.id, [entry]);
		}
	}

	roleIndexes.set(guild.id, index);
	return index;
}

export function rememberDeletedRole(role: Role): void {
	const guild = role.guild;
	const index = roleIndexOf(guild);
	const memberIds = index.members.get(role.id) ?? [];
	const overwrites = index.overwrites.get(role.id) ?? [];

	const body: RawBody = {
		name: role.name,
		permissions: role.permissions.bitfield.toString(),
		hoist: role.hoist,
		mentionable: role.mentionable
	};
	if (role.colors.secondaryColor !== null) {
		body.colors = {
			primary_color: role.colors.primaryColor,
			secondary_color: role.colors.secondaryColor,
			tertiary_color: role.colors.tertiaryColor
		};
	} else {
		body.color = role.colors.primaryColor;
	}
	assign(body, "unicode_emoji", role.unicodeEmoji);

	deletedRoles.set(keyOf(guild.id, role.id), {
		body,
		iconHash: role.icon,
		rawPosition: role.rawPosition,
		memberIds,
		overwrites
	});
}

/* ------------------------------------------------------------------ */
/* Decision                                                           */
/* ------------------------------------------------------------------ */

function changesOf(entry: GuildAuditLogsEntry): AuditChange[] {
	return entry.changes as unknown as AuditChange[];
}

function roleIdsOf(changes: AuditChange[], key: "$add" | "$remove"): string[] {
	return changes
		.filter((change) => change.key === key)
		.flatMap((change) => (change.new as { id: string }[] | undefined) ?? [])
		.map((role) => role.id);
}

const ADMINISTRATOR = PermissionFlagsBits.Administrator;

function hasAdministrator(permissions: unknown): boolean {
	if (typeof permissions !== "string" && typeof permissions !== "number")
		return false;
	try {
		return (BigInt(permissions) & ADMINISTRATOR) === ADMINISTRATOR;
	} catch {
		return false;
	}
}

/**
 * Administrator can be obtained three ways: getting an admin role, an existing
 * role (or @everyone) gaining the permission, or a role created with it.
 */
function grantsAdministrator(
	entry: GuildAuditLogsEntry,
	guild: Guild
): boolean {
	const changes = changesOf(entry);
	switch (entry.action) {
		case AuditLogEvent.MemberRoleUpdate:
			return roleIdsOf(changes, "$add").some((id) =>
				guild.roles.cache.get(id)?.permissions.has(ADMINISTRATOR)
			);
		case AuditLogEvent.RoleCreate:
			return hasAdministrator(
				changes.find((change) => change.key === "permissions")?.new
			);
		case AuditLogEvent.RoleUpdate: {
			const change = changes.find((c) => c.key === "permissions");
			return (
				!!change &&
				!hasAdministrator(change.old) &&
				hasAdministrator(change.new)
			);
		}
		default:
			return false;
	}
}

function breaksRule(
	rule: DatabaseStructure.ProtectionRuleData,
	executorId: string,
	context: ProtectionContext
): boolean {
	switch (rule.mode) {
		case "allowlist":
			return !context.allowlist[executorId];
		case "nobody":
			return true;
		default:
			return false;
	}
}

function findBrokenRule(
	entry: GuildAuditLogsEntry,
	guild: Guild,
	executorId: string,
	context: ProtectionContext
): ProtectionRuleKey | undefined {
	return RULES_BY_ACTION[entry.action]?.find((key) => {
		const rule = context.protection[key];
		if (!rule || typeof rule !== "object") return false;
		if (!breaksRule(rule, executorId, context)) return false;
		return key !== "add_admin_roles" || grantsAdministrator(entry, guild);
	});
}

/* ------------------------------------------------------------------ */
/* Sanction                                                           */
/* ------------------------------------------------------------------ */

async function sanction(
	guild: Guild,
	executorId: string,
	context: ProtectionContext,
	ruleKey: ProtectionRuleKey
): Promise<void> {
	const rule = context.protection[ruleKey];
	const name =
		(rule && typeof rule === "object" ? rule.sanction : undefined) ||
		context.protection.SANCTION;
	const severity = name ? SANCTION_SEVERITY[name] : undefined;
	if (!severity) return;

	// One sanction per burst; only a more severe rule escalates it.
	const key = keyOf(guild.id, executorId);
	if ((sanctions.get(key) ?? -1) >= severity) return;
	sanctions.set(key, severity);

	await client.func.method.punish(
		context.protection,
		{ guild, id: executorId },
		`[Protect] Rule "${ruleKey}" broken`,
		ruleKey
	);
}

/* ------------------------------------------------------------------ */
/* Restoration                                                        */
/* ------------------------------------------------------------------ */

function revertedFields(changes: AuditChange[], keys: Set<string>): RawBody {
	const body: RawBody = {};
	for (const change of changes) {
		if (keys.has(change.key)) body[change.key] = change.old ?? null;
	}
	return body;
}

function oldValue(changes: AuditChange[], key: string): unknown {
	return changes.find((change) => change.key === key)?.old;
}

async function imageDataUri(url: string): Promise<string | undefined> {
	const buffer = await client.func.image64.image64(url);
	if (!buffer) return undefined;
	const mime = url.includes(".gif") ? "image/gif" : "image/png";
	return `data:${mime};base64,${buffer.toString("base64")}`;
}

/**
 * Turns `<key>_hash` audit changes back into uploadable images. A failed
 * download leaves the field out rather than wiping the current image.
 */
async function revertedImages(
	changes: AuditChange[],
	fields: Record<string, { key: string; url: (hash: string) => string }>
): Promise<RawBody> {
	const body: RawBody = {};
	await Promise.all(
		changes.map(async (change) => {
			const field = fields[change.key];
			if (!field) return;
			if (typeof change.old !== "string") {
				body[field.key] = null;
				return;
			}
			const image = await imageDataUri(field.url(change.old));
			if (image) body[field.key] = image;
		})
	);
	return body;
}

const IMAGE_OPTIONS = { extension: "png", size: 4096 } as const;

const bulkQueues = new Map<
	string,
	{ active: number; waiting: (() => void)[] }
>();

/** Runs a bulk request through the guild's bounded queue. */
async function bulk<T>(guildId: string, task: () => Promise<T>): Promise<T> {
	let queue = bulkQueues.get(guildId);
	if (!queue) {
		queue = { active: 0, waiting: [] };
		bulkQueues.set(guildId, queue);
	}
	const slots = queue;
	if (slots.active >= BULK_CONCURRENCY) {
		// The finishing task hands its slot over: no increment here.
		await new Promise<void>((resolve) => slots.waiting.push(resolve));
	} else {
		slots.active++;
	}
	try {
		return await task();
	} finally {
		const next = slots.waiting.shift();
		if (next) next();
		else if (--slots.active === 0) bulkQueues.delete(guildId);
	}
}

/** Resolves an id that may belong to a channel/role recreated by this engine. */
async function resolveId(
	guild: Guild,
	id: string,
	exists: boolean
): Promise<string | null> {
	if (exists) return id;
	return (await recreated.wait(keyOf(guild.id, id), REMAP_WAIT_MS)) ?? null;
}

function overwriteTarget(
	entry: GuildAuditLogsEntry
): { id: string; type: OverwriteType } | null {
	const extra = entry.extra as
		Role | GuildMember | { id?: string; type?: AuditLogOptionsType } | null;
	if (!extra?.id) return null;
	if (extra instanceof Role)
		return { id: extra.id, type: OverwriteType.Role };
	if (extra instanceof GuildMember)
		return { id: extra.id, type: OverwriteType.Member };
	return {
		id: extra.id,
		type:
			extra.type === AuditLogOptionsType.Member
				? OverwriteType.Member
				: OverwriteType.Role
	};
}

async function restoreOverwrite(
	entry: GuildAuditLogsEntry,
	guild: Guild,
	channelId: string,
	reason: string
): Promise<void> {
	const target = overwriteTarget(entry);
	if (!target) return;
	const route = Routes.channelPermission(channelId, target.id);

	if (entry.action === AuditLogEvent.ChannelOverwriteCreate) {
		await client.rest.delete(route, { reason });
		return;
	}

	// An update only lists the side (allow / deny) that changed.
	const changes = changesOf(entry);
	const channel = guild.channels.cache.get(channelId);
	const current =
		channel && "permissionOverwrites" in channel
			? channel.permissionOverwrites.cache.get(target.id)
			: undefined;
	const allow =
		oldValue(changes, "allow") ?? current?.allow.bitfield.toString() ?? "0";
	const deny =
		oldValue(changes, "deny") ?? current?.deny.bitfield.toString() ?? "0";

	await client.rest.put(route, {
		body: { type: target.type, allow, deny },
		reason
	});
}

async function restoreMemberRoles(
	guild: Guild,
	memberId: string,
	changes: AuditChange[],
	reason: string,
	reAddRemoved: boolean
): Promise<void> {
	const ceiling = guild.members.me?.roles.highest.position ?? 0;
	const editable = (id: string) => {
		const role = guild.roles.cache.get(id);
		return !!role && !role.managed && role.position < ceiling;
	};

	// Per-role routes: only the roles of this entry are touched, so a
	// concurrent change on the same member is never overwritten, and the
	// member does not need to be cached.
	const tasks = [
		...roleIdsOf(changes, "$add")
			.filter(editable)
			.map((id) =>
				client.rest.delete(
					Routes.guildMemberRole(guild.id, memberId, id),
					{ reason }
				)
			),
		...(reAddRemoved ? roleIdsOf(changes, "$remove") : [])
			.filter(editable)
			.map((id) =>
				client.rest.put(
					Routes.guildMemberRole(guild.id, memberId, id),
					{
						reason
					}
				)
			)
	];
	await Promise.all(tasks);
}

async function reattachOrphans(
	guild: Guild,
	oldCategoryId: string,
	newCategoryId: string,
	reason: string
): Promise<void> {
	const children = [
		...(orphans.get(keyOf(guild.id, oldCategoryId)) ?? [])
	].filter((id) => {
		const channel = guild.channels.cache.get(id);
		return channel && channel.parentId !== newCategoryId;
	});
	if (children.length === 0) return;

	const move = (id: string) => ({
		id,
		parent_id: newCategoryId,
		lock_permissions: false
	});

	// Single bulk request for every channel of the category. It fails as a
	// whole if one of them was deleted meanwhile: fall back to one per channel.
	try {
		await client.rest.patch(Routes.guildChannels(guild.id), {
			body: children.map(move),
			reason
		});
	} catch {
		await Promise.allSettled(
			children.map((id) =>
				client.rest.patch(Routes.guildChannels(guild.id), {
					body: [move(id)],
					reason
				})
			)
		);
	}
}

function channelSnapshotFromChanges(
	changes: AuditChange[]
): DeletedChannelSnapshot | undefined {
	const body = revertedFields(changes, CHANNEL_KEYS);
	if (typeof body.name !== "string") return undefined;
	return {
		body,
		parentId: typeof body.parent_id === "string" ? body.parent_id : null,
		overwrites:
			(oldValue(changes, "permission_overwrites") as
				APIOverwrite[] | undefined) ?? []
	};
}

async function restoreDeletedChannel(
	guild: Guild,
	oldId: string,
	changes: AuditChange[],
	reason: string
): Promise<void> {
	const key = keyOf(guild.id, oldId);
	if (restoring.has(key)) return;
	restoring.set(key, true);

	try {
		const snapshot =
			(await deletedChannels.wait(key, SNAPSHOT_WAIT_MS)) ??
			channelSnapshotFromChanges(changes);
		if (!snapshot) {
			recreated.set(key, null);
			return;
		}

		// Parent category and role overwrites may be in the middle of their
		// own recreation: wait briefly for their new ids.
		const [parentId, overwrites] = await Promise.all([
			snapshot.parentId
				? resolveId(
						guild,
						snapshot.parentId,
						guild.channels.cache.has(snapshot.parentId)
					)
				: null,
			Promise.all(
				snapshot.overwrites.map(async (overwrite) => {
					const exists =
						overwrite.type === OverwriteType.Member ||
						overwrite.id === guild.id ||
						guild.roles.cache.has(overwrite.id);
					const id = await resolveId(guild, overwrite.id, exists);
					return id ? { ...overwrite, id } : null;
				})
			)
		]);

		const permissionOverwrites = overwrites.filter(
			(overwrite): overwrite is APIOverwrite => overwrite !== null
		);
		const body = {
			...snapshot.body,
			parent_id: parentId,
			permission_overwrites: permissionOverwrites
		} as RESTPostAPIGuildChannelJSONBody;

		let created: { id: string };
		try {
			created = (await client.rest.post(Routes.guildChannels(guild.id), {
				body,
				reason
			})) as { id: string };
		} catch {
			// Usually a member overwrite for someone who left: keep the rest.
			body.permission_overwrites = permissionOverwrites.filter(
				(overwrite) =>
					overwrite.type === OverwriteType.Role ||
					guild.members.cache.has(overwrite.id)
			);
			created = (await client.rest.post(Routes.guildChannels(guild.id), {
				body,
				reason
			})) as { id: string };
		}

		recreated.set(key, created.id);
		await reattachOrphans(guild, oldId, created.id, reason);
	} catch (error) {
		recreated.set(key, null);
		throw error;
	}
}

async function restoreDeletedRole(
	guild: Guild,
	oldId: string,
	executorId: string,
	changes: AuditChange[],
	reason: string
): Promise<void> {
	const key = keyOf(guild.id, oldId);
	if (restoring.has(key)) return;
	restoring.set(key, true);

	try {
		const snapshot = await deletedRoles.wait(key, SNAPSHOT_WAIT_MS);
		const fallback = revertedFields(changes, ROLE_KEYS);
		const body = snapshot ? { ...snapshot.body } : fallback;
		if (typeof body.name !== "string") {
			recreated.set(key, null);
			return;
		}
		if (snapshot?.iconHash && guild.features.includes("ROLE_ICONS")) {
			assign(
				body,
				"icon",
				await imageDataUri(
					client.rest.cdn.roleIcon(
						oldId,
						snapshot.iconHash,
						IMAGE_OPTIONS
					)
				)
			);
		}

		let created: { id: string };
		try {
			created = (await client.rest.post(Routes.guildRoles(guild.id), {
				body: body as RESTPostAPIGuildRoleJSONBody,
				reason
			})) as { id: string };
		} catch {
			// Gradient colors / icon / emoji need guild features: retry without them.
			const { colors, icon, unicode_emoji, ...basic } = body;
			created = (await client.rest.post(Routes.guildRoles(guild.id), {
				body: {
					...basic,
					color:
						(colors as { primary_color?: number } | undefined)
							?.primary_color ?? basic.color
				} as RESTPostAPIGuildRoleJSONBody,
				reason
			})) as { id: string };
		}
		const newId = created.id;
		recreated.set(key, newId);
		if (!snapshot) return;

		const ceiling = guild.members.me?.roles.highest.rawPosition ?? 1;
		const tasks: Promise<unknown>[] = [
			client.rest.patch(Routes.guildRoles(guild.id), {
				body: [
					{
						id: newId,
						position: Math.max(
							1,
							Math.min(snapshot.rawPosition, ceiling - 1)
						)
					}
				],
				reason
			})
		];

		for (const overwrite of snapshot.overwrites) {
			if (!guild.channels.cache.has(overwrite.channelId)) continue;
			tasks.push(
				bulk(guild.id, () =>
					client.rest.put(
						Routes.channelPermission(overwrite.channelId, newId),
						{
							body: {
								type: OverwriteType.Role,
								allow: overwrite.allow,
								deny: overwrite.deny
							},
							reason
						}
					)
				)
			);
		}

		// Never hand the role back to the one who deleted it.
		for (const memberId of snapshot.memberIds) {
			if (memberId === executorId) continue;
			tasks.push(
				bulk(guild.id, () =>
					client.rest.put(
						Routes.guildMemberRole(guild.id, memberId, newId),
						{ reason }
					)
				)
			);
		}

		await Promise.allSettled(tasks);
	} catch (error) {
		recreated.set(key, null);
		throw error;
	}
}

async function restoreGuild(
	guild: Guild,
	changes: AuditChange[],
	reason: string
): Promise<void> {
	const id = guild.id;
	const body = {
		...revertedFields(changes, GUILD_KEYS),
		...(await revertedImages(changes, {
			icon_hash: {
				key: "icon",
				url: (hash) => client.rest.cdn.icon(id, hash, IMAGE_OPTIONS)
			},
			banner_hash: {
				key: "banner",
				url: (hash) => client.rest.cdn.banner(id, hash, IMAGE_OPTIONS)
			},
			splash_hash: {
				key: "splash",
				url: (hash) => client.rest.cdn.splash(id, hash, IMAGE_OPTIONS)
			},
			discovery_splash_hash: {
				key: "discovery_splash",
				url: (hash) =>
					client.rest.cdn.discoverySplash(id, hash, IMAGE_OPTIONS)
			}
		}))
	};

	const tasks: Promise<unknown>[] = [];
	if (Object.keys(body).length > 0) {
		tasks.push(client.rest.patch(Routes.guild(id), { body, reason }));
	}
	const mfaLevel = oldValue(changes, "mfa_level");
	if (typeof mfaLevel === "number") {
		tasks.push(
			client.rest.post(Routes.guildMFA(id), {
				body: { level: mfaLevel },
				reason
			})
		);
	}
	await Promise.all(tasks);
}

async function restore(
	entry: GuildAuditLogsEntry,
	guild: Guild,
	executorId: string
): Promise<void> {
	const targetId = entry.targetId;
	if (!targetId) return;

	const changes = changesOf(entry);
	const reason = `[Protect] Reverting an action of ${executorId}`;

	switch (entry.action) {
		case AuditLogEvent.ChannelCreate:
			await guild.channels.delete(targetId, reason);
			return;
		case AuditLogEvent.ChannelDelete:
			await restoreDeletedChannel(guild, targetId, changes, reason);
			return;
		case AuditLogEvent.ChannelUpdate: {
			const body = revertedFields(changes, CHANNEL_KEYS);
			if (Object.keys(body).length === 0) return;
			await client.rest.patch(Routes.channel(targetId), { body, reason });
			return;
		}
		case AuditLogEvent.ChannelOverwriteCreate:
		case AuditLogEvent.ChannelOverwriteUpdate:
		case AuditLogEvent.ChannelOverwriteDelete:
			await restoreOverwrite(entry, guild, targetId, reason);
			return;
		case AuditLogEvent.RoleCreate:
			await guild.roles.delete(targetId, reason);
			return;
		case AuditLogEvent.RoleDelete:
			await restoreDeletedRole(
				guild,
				targetId,
				executorId,
				changes,
				reason
			);
			return;
		case AuditLogEvent.RoleUpdate: {
			const body = {
				...revertedFields(changes, ROLE_KEYS),
				...(await revertedImages(changes, {
					icon_hash: {
						key: "icon",
						url: (hash) =>
							client.rest.cdn.roleIcon(
								targetId,
								hash,
								IMAGE_OPTIONS
							)
					}
				}))
			};
			if (Object.keys(body).length === 0) return;
			await client.rest.patch(Routes.guildRole(guild.id, targetId), {
				body,
				reason
			});
			return;
		}
		case AuditLogEvent.MemberRoleUpdate:
			// Never give roles back to an executor acting on themselves:
			// it would race with (and undo) their derank.
			await restoreMemberRoles(
				guild,
				targetId,
				changes,
				reason,
				targetId !== executorId
			);
			return;
		case AuditLogEvent.MemberBanAdd:
			await guild.bans.remove(targetId, reason);
			return;
		case AuditLogEvent.MemberBanRemove:
			await guild.bans.create(targetId, { reason });
			return;
		case AuditLogEvent.WebhookCreate:
			await client.rest.delete(Routes.webhook(targetId), { reason });
			return;
		case AuditLogEvent.WebhookUpdate: {
			const body = {
				...revertedFields(changes, WEBHOOK_KEYS),
				...(await revertedImages(changes, {
					avatar_hash: {
						key: "avatar",
						url: (hash) =>
							client.rest.cdn.avatar(
								targetId,
								hash,
								IMAGE_OPTIONS
							)
					}
				}))
			};
			if (Object.keys(body).length === 0) return;
			await client.rest.patch(Routes.webhook(targetId), { body, reason });
			return;
		}
		case AuditLogEvent.GuildUpdate:
			await restoreGuild(guild, changes, reason);
			return;
		default:
			// Kick, prune and webhook deletion cannot be undone.
			return;
	}
}

/* ------------------------------------------------------------------ */
/* Entry point                                                        */
/* ------------------------------------------------------------------ */

export async function handleProtectionEntry(
	entry: GuildAuditLogsEntry,
	guild: Guild
): Promise<void> {
	const executorId = entry.executorId;
	if (!executorId || executorId === client.user?.id) return;
	if (!RULES_BY_ACTION[entry.action]) return;
	// No Administrator gate: anti-ban / kick / role-update only need their own
	// permissions, and a refused call is caught below.

	const context = await getContext(guild.id);
	if (!context) return;
	if (executorId === guild.ownerId || context.owners[executorId]) return;

	const ruleKey = findBrokenRule(entry, guild, executorId, context);
	if (!ruleKey) return;

	logger.debug(
		`[Protect] ${guild.id}: ${executorId} broke "${ruleKey}" (action ${entry.action}, target ${entry.targetId})`
	);

	const punishment = () => sanction(guild, executorId, context, ruleKey);
	const restoration = () => restore(entry, guild, executorId);

	// Sanction first in the REST queue: stopping the attacker beats repairing.
	const results = await Promise.allSettled([punishment(), restoration()]);

	for (const result of results) {
		if (result.status === "rejected") {
			logger.debug(
				`[Protect] ${guild.id}: ${String((result.reason as Error)?.message ?? result.reason)}`
			);
		}
	}
}
