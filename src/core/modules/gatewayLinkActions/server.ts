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
	ChannelType,
	Client,
	Guild,
	GuildMember,
	PermissionFlagsBits,
	Role,
	User
} from "discord.js";

import { metasTable, prevnamesTable } from "../../../Events/client/ready.js";
import { isValidDiscordInvite } from "../../functions/method/invites.js";
import { loadHistory } from "../prevnamesHistory.js";
import { adminMembers, adminRoles, guildBots } from "../serverAudit.js";
import {
	createGuildEmoji,
	emojiNameTaken,
	MAX_EMOJI_BYTES
} from "../emojiImport.js";
import {
	BACKUP_FREQUENCIES,
	buildSchedule,
	DEFAULT_BACKUP_COMPONENTS,
	MAX_AUTO_BACKUPS_PER_GUILD,
	MAX_BACKUPS_PER_USER,
	normalizeComponents,
	frequencyKey,
	BACKUP_COMPONENTS,
	type BackupComponent,
	type BackupFrequencyKey
} from "../../backup/src/components.js";
import { BackupBusyError, BackupLimitError } from "../../backup/src/index.js";
import {
	canUseBackups,
	createBackupLogged,
	prepareBackupLoad,
	runBackupLoad,
	type BackupLoadRefusal
} from "../backupPanels.js";
import { botSignature, cardPayload } from "../uiCard.js";
import {
	type AutomodRuleKey,
	DEFAULT_MENTION_LIMIT,
	disableAutomodRule,
	enableAutomodRule,
	loadAutomodState,
	MAX_MENTION_LIMIT,
	RULE_ORDER,
	saveAutomodBypass,
	saveAutomodLogs
} from "../automodRules.js";
import {
	bannerDataUri,
	changeGuildBotBanner,
	changeGuildBotBio,
	MAX_CUSTOM_BIO_LENGTH,
	resetGuildBotBanner,
	resetGuildBotBio
} from "../../functions/customProfileHelper.js";
import {
	ActionContext,
	ActionError,
	ActionGroup,
	fail,
	Params
} from "./types.js";

// Server tools of the dashboard: audit lists, server and member info,
// emojis, backups, AutoMod and the bot's profile on the server.

const LIST_CAP = 500;
/** Images sent as base64 for a banner of the bot on this server. */
export const MAX_BANNER_BYTES = 1024 * 1024;
/** Longest a backup creation is awaited before it goes on in the background. */
const CREATE_WAIT_MS = 50_000;

// ---------------------------------------------------------------------------
// Pure helpers (tested)

const IMAGE_SIGNATURES: { type: string; test: (b: Buffer) => boolean }[] = [
	{
		type: "image/png",
		test: (b) =>
			b.length > 8 &&
			b[0] === 0x89 &&
			b.toString("latin1", 1, 4) === "PNG"
	},
	{
		type: "image/jpeg",
		test: (b) =>
			b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
	},
	{
		type: "image/gif",
		test: (b) => b.length > 6 && b.toString("latin1", 0, 4) === "GIF8"
	},
	{
		type: "image/webp",
		test: (b) =>
			b.length > 12 &&
			b.toString("latin1", 0, 4) === "RIFF" &&
			b.toString("latin1", 8, 12) === "WEBP"
	}
];

/** The image type read from the bytes, never from what the client says. */
export function sniffImageType(buf: Buffer): string | null {
	return IMAGE_SIGNATURES.find((s) => s.test(buf))?.type ?? null;
}

const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * Decodes a base64 image (a `data:` URI prefix is allowed) of at most
 * `maxBytes`, checked on the encoded length before decoding.
 */
export function decodeImage(
	value: unknown,
	key: string,
	maxBytes: number
): { buffer: Buffer; type: string } {
	if (typeof value !== "string" || !value)
		return fail(`missing parameter: ${key}`);
	const comma = value.startsWith("data:") ? value.indexOf(",") : -1;
	const raw = (comma >= 0 ? value.slice(comma + 1) : value).replace(
		/\s+/g,
		""
	);
	if (raw.length > Math.ceil(maxBytes / 3) * 4)
		return fail(`${key} is larger than ${Math.floor(maxBytes / 1024)} KiB`);
	if (!raw.length || raw.length % 4 !== 0 || !BASE64.test(raw))
		return fail(`invalid parameter: ${key}`);
	const buffer = Buffer.from(raw, "base64");
	if (buffer.length > maxBytes)
		return fail(`${key} is larger than ${Math.floor(maxBytes / 1024)} KiB`);
	const type = sniffImageType(buffer);
	if (!type || !client.func.validImageType(type))
		return fail(`${key} must be a PNG, JPEG, GIF or WebP image`);
	return { buffer, type };
}

/** Discord's rule for emoji names. */
export const EMOJI_NAME = /^\w{2,32}$/;

/** Backup components, as a JSON array or a comma list; null when absent. */
function components(params: Params, key: string): BackupComponent[] | null {
	if (!params.has(key)) return null;
	const v = params.raw_(key);
	const list = typeof v === "string" ? v.split(",").filter(Boolean) : v;
	if (
		!Array.isArray(list) ||
		!list.length ||
		list.some(
			(c) =>
				typeof c !== "string" ||
				!(BACKUP_COMPONENTS as readonly string[]).includes(c)
		)
	)
		return fail(`invalid parameter: ${key}`);
	return normalizeComponents(list as string[]);
}

/** English text of each /backup load refusal. */
export const BACKUP_LOAD_ERRORS: Record<BackupLoadRefusal, string> = {
	not_allowed:
		"forbidden: only the server owner can use backups here (/backup manage)",
	bot_not_admin: "the bot needs Administrator to load a backup",
	invalid_id: "missing parameter: id",
	not_yours: "backup not found",
	missing: "backup not found"
};

// ---------------------------------------------------------------------------
// Serializers

const ms = (d: Date | null | undefined) => (d ? d.getTime() : null);

function userView(user: User) {
	return {
		id: user.id,
		username: user.username,
		displayName: user.displayName,
		avatar: user.displayAvatarURL({ size: 64 }),
		bot: user.bot
	};
}

function memberView(member: GuildMember) {
	return {
		...userView(member.user),
		displayName: member.displayName,
		avatar: member.displayAvatarURL({ size: 64 }),
		joinedAt: member.joinedTimestamp ?? null,
		highestRoleId:
			member.roles.highest.id === member.guild.id
				? null
				: member.roles.highest.id
	};
}

function roleView(role: Role) {
	return {
		id: role.id,
		name: role.name,
		color: role.color,
		position: role.position,
		managed: role.managed,
		memberCount: role.members.size
	};
}

function backupEntryView(
	id: string,
	entry: {
		guildName: string;
		guildId?: string;
		createdTimestamp?: number;
		components?: string[];
		auto?: boolean;
		categoryCount: number;
		channelCount: number;
	}
) {
	return {
		id,
		guildName: entry.guildName,
		guildId: entry.guildId ?? null,
		createdAt: entry.createdTimestamp ?? null,
		auto: entry.auto === true,
		components: normalizeComponents(entry.components ?? []),
		categoryCount: entry.categoryCount,
		channelCount: entry.channelCount
	};
}

// ---------------------------------------------------------------------------
// Guards

function needBotPermission(guild: Guild, permission: bigint, name: string) {
	if (!guild.members.me?.permissions.has(permission)) {
		fail(`the bot needs ${name} on this server`);
	}
}

/** One action, two commands (`/custom bio` and `/custom banner`). */
async function authorizeAlso(
	ctx: ActionContext,
	command: string,
	opts: { read: boolean }
) {
	// Loaded here: index.ts imports this file.
	const { authorize } = await import("./index.js");
	await authorize(ctx.client, ctx.actor, {
		command,
		read: opts.read,
		run: async () => null
	});
}

async function automodReady(ctx: ActionContext) {
	// The panel refuses to open without it: every rule edit needs it.
	needBotPermission(
		ctx.guild,
		PermissionFlagsBits.ManageGuild,
		"Manage Server"
	);
	try {
		return await loadAutomodState(ctx.guild, ctx.client.db);
	} catch (error) {
		logger.err(error);
		return fail("Discord refused to list the AutoMod rules");
	}
}

function automodView(
	rules: Awaited<ReturnType<typeof loadAutomodState>>["rules"]
) {
	return RULE_ORDER.map((key) => ({
		key,
		enabled: rules[key].enabled,
		ruleId: rules[key].ruleId,
		bypassRoles: rules[key].bypassRoles,
		logsChannel: rules[key].logsChannel,
		mentionLimit:
			key === "mass_mention"
				? (rules[key].mentionLimit ?? DEFAULT_MENTION_LIMIT)
				: null
	}));
}

// ---------------------------------------------------------------------------

export const serverActions: ActionGroup = {
	// --- Audit ---------------------------------------------------------------

	// /utils admin-users + /util admin-roles.
	"audit.admins": {
		read: true,
		command: "utils admin-users",
		run: async ({ guild }) => {
			const roles = adminRoles(guild);
			const members = adminMembers(guild);
			return {
				roles: roles.slice(0, LIST_CAP).map(roleView),
				members: members.slice(0, LIST_CAP).map(memberView),
				truncated: roles.length > LIST_CAP || members.length > LIST_CAP
			};
		}
	},

	// /util allwebhooks. Never the token or the URL.
	"audit.webhooks": {
		read: true,
		command: "util allwebhooks",
		run: async ({ guild }) => {
			needBotPermission(
				guild,
				PermissionFlagsBits.ManageWebhooks,
				"Manage Webhooks"
			);
			const hooks = await guild.fetchWebhooks().catch(() => null);
			if (!hooks) return fail("Discord refused to list the webhooks");
			const list = [...hooks.values()];
			return {
				webhooks: list.slice(0, LIST_CAP).map((w) => ({
					id: w.id,
					name: w.name,
					type: w.type,
					channelId: w.channelId ?? null,
					ownerId: w.owner?.id ?? null,
					applicationId: w.applicationId ?? null,
					avatar: w.avatarURL({ size: 64 }),
					createdAt: w.createdTimestamp
				})),
				truncated: list.length > LIST_CAP
			};
		}
	},

	// /utils allbots.
	"audit.bots": {
		read: true,
		command: "utils allbots",
		run: async ({ guild }) => {
			const bots = guildBots(guild);
			return {
				bots: bots.slice(0, LIST_CAP).map((m) => ({
					...memberView(m),
					verified: m.user.flags?.has("VerifiedBot") ?? false
				})),
				truncated: bots.length > LIST_CAP
			};
		}
	},

	// /util role-members. Paged by member id: `after` + `limit`.
	"roles.members": {
		read: true,
		command: "util role-members",
		run: async ({ guild, params }) => {
			const role = guild.roles.cache.get(params.id("roleId"));
			if (!role) return fail("role not found");
			const after = params.optId("after");
			const limit = params.int("limit", { min: 1, max: 100, def: 50 });
			const all = [...role.members.values()].sort((a, b) =>
				BigInt(a.id) < BigInt(b.id) ? -1 : 1
			);
			const start = after
				? all.findIndex((m) => BigInt(m.id) > BigInt(after))
				: 0;
			const page = start < 0 ? [] : all.slice(start, start + limit);
			const last = page.at(-1);
			return {
				role: roleView(role),
				members: page.map(memberView),
				nextCursor:
					last && all.indexOf(last) < all.length - 1 ? last.id : null
			};
		}
	},

	// /util inviteinfo.
	"invites.info": {
		read: true,
		command: "util inviteinfo",
		run: async ({ client, params }) => {
			const code = params.str("code", { max: 100 }).trim();
			if (!isValidDiscordInvite(code)) return fail("invalid invite");
			const invite = await client.fetchInvite(code).catch(() => null);
			if (!invite) return fail("invite not found");
			const g = invite.guild;
			return {
				code: invite.code,
				channelId: invite.channelId ?? null,
				inviter: invite.inviter ? userView(invite.inviter) : null,
				expiresAt: invite.expiresTimestamp ?? null,
				memberCount: invite.memberCount ?? null,
				presenceCount: invite.presenceCount ?? null,
				guild: g
					? {
							id: g.id,
							name: g.name,
							description: g.description ?? null,
							icon: g.iconURL({ size: 128 }),
							banner: await client.func.bannerURL(g, {
								size: 1024
							}),
							splash: g.splashURL({ size: 1024 }),
							createdAt: g.createdTimestamp,
							boosts: g.premiumSubscriptionCount ?? 0,
							features: [...g.features]
						}
					: null
			};
		}
	},

	// --- Server and members ----------------------------------------------------

	// /utils serverinfo + /util serverpic + /banner server.
	"server.info": {
		read: true,
		command: "utils serverinfo",
		run: async ({ client, guild }) => ({
			id: guild.id,
			name: guild.name,
			description: guild.description,
			ownerId: guild.ownerId,
			memberCount: guild.memberCount,
			createdAt: guild.createdTimestamp,
			roleCount: guild.roles.cache.size,
			channelCount: guild.channels.cache.size,
			emojiCount: guild.emojis.cache.size,
			stickerCount: guild.stickers.cache.size,
			boosts: guild.premiumSubscriptionCount ?? 0,
			tier: guild.premiumTier,
			verificationLevel: guild.verificationLevel,
			preferredLocale: guild.preferredLocale,
			vanityCode: guild.vanityURLCode,
			features: [...guild.features],
			icon: guild.iconURL({ size: 256, forceStatic: false }),
			banner: await client.func.bannerURL(guild, {
				size: 1024,
				forceStatic: false
			}),
			splash: guild.splashURL({ size: 1024 })
		})
	},

	// /utils userinfo + /utils prevnames: any user, like the commands.
	"members.info": {
		read: true,
		command: "utils userinfo",
		run: async (ctx) => {
			const { client, guild, params } = ctx;
			const userId = params.id("userId");
			// The names history is /utils prevnames: its own rules apply.
			await authorizeAlso(ctx, "utils prevnames", { read: true });
			const user = await client.users
				.fetch(userId, { force: true })
				.catch(() => null);
			if (!user) return fail("user not found");
			const member = await guild.members.fetch(userId).catch(() => null);
			// Read only: /utils prevnames repairs old entries, a read does not.
			const history = loadHistory(
				await prevnamesTable.get(userId)
			).reverse();
			return {
				...userView(user),
				globalName: user.globalName,
				avatar: user.displayAvatarURL({ size: 256 }),
				banner: user.bannerURL({ size: 1024 }) ?? null,
				accentColor: user.accentColor ?? null,
				createdAt: user.createdTimestamp,
				badges: user.flags?.toArray() ?? [],
				member: member
					? {
							nickname: member.nickname,
							avatar: member.avatarURL({ size: 256 }),
							joinedAt: member.joinedTimestamp ?? null,
							premiumSince: member.premiumSinceTimestamp ?? null,
							isOwner: guild.ownerId === member.id,
							// Highest first, without @everyone.
							roles: member.roles.cache
								.filter((r) => r.id !== guild.id)
								.sort((a, b) => b.position - a.position)
								.map((r) => r.id)
								.slice(0, 100),
							platforms: Object.keys(
								member.presence?.clientStatus ?? {}
							),
							status: member.presence?.status ?? null
						}
					: null,
				prevnames: history.slice(0, 100).map((e) => ({
					type: e.type,
					name: e.name,
					at: e.at,
					guildName: e.type === "nickname" ? e.guild.name : null
				})),
				prevnamesTotal: history.length
			};
		}
	},

	// --- Emojis ------------------------------------------------------------------

	// What /utils zip-emojis and /util zip-stickers export.
	"emojis.list": {
		read: true,
		command: "utils zip-emojis",
		run: async ({ guild }) => ({
			emojis: [...guild.emojis.cache.values()]
				.slice(0, LIST_CAP)
				.map((e) => ({
					id: e.id,
					name: e.name,
					animated: e.animated ?? false,
					available: e.available ?? true,
					managed: e.managed ?? false,
					url: e.imageURL({ size: 128 })
				})),
			stickers: [...guild.stickers.cache.values()]
				.slice(0, LIST_CAP)
				.map((s) => ({
					id: s.id,
					name: s.name,
					description: s.description,
					tags: s.tags,
					format: s.format,
					available: s.available ?? true,
					url: s.url
				}))
		})
	},

	// One emoji, like each file of /util unzip-emojis.
	"emojis.create": {
		command: "util unzip-emojis",
		run: async ({ guild, params }) => {
			needBotPermission(
				guild,
				PermissionFlagsBits.ManageGuildExpressions,
				"Manage Expressions"
			);
			const name = params.str("name", { max: 32 });
			if (!EMOJI_NAME.test(name))
				return fail(
					"invalid parameter: name (2 to 32 letters, digits or _)"
				);
			if (emojiNameTaken(guild, name))
				return fail("an emoji with this name already exists");
			const { buffer } = decodeImage(
				params.raw_("image"),
				"image",
				MAX_EMOJI_BYTES
			);
			const emoji = await createGuildEmoji(guild, name, buffer);
			if (!emoji)
				return fail(
					"Discord refused the emoji (no free slot or invalid image)"
				);
			return {
				id: emoji.id,
				name: emoji.name,
				animated: emoji.animated ?? false,
				url: emoji.imageURL({ size: 128 })
			};
		}
	},

	// --- Backups (the author's own, like /backup) ---------------------------------

	"backups.list": {
		read: true,
		command: "backup list",
		run: async ({ client, actor }) => {
			const index = await client.backup.getUserBackups(actor.id);
			const ids = Object.keys(index).sort((a, b) =>
				BigInt(a) < BigInt(b) ? 1 : -1
			);
			return {
				count: ids.length,
				max: MAX_BACKUPS_PER_USER,
				backups: ids.map((id) => backupEntryView(id, index[id]))
			};
		}
	},

	// /backup create. Waits up to 50 s, then lets it finish in the background.
	"backups.create": {
		command: "backup create",
		run: async ({ client, guild, actor, params, lang }) => {
			if (!(await canUseBackups(client, guild, actor.id)))
				return fail(BACKUP_LOAD_ERRORS.not_allowed);
			const used = Object.keys(
				await client.backup.getUserBackups(actor.id)
			).length;
			if (used >= MAX_BACKUPS_PER_USER)
				return fail(
					`backup limit reached (${MAX_BACKUPS_PER_USER} per user)`
				);
			const selected = components(params, "components") ?? [
				...DEFAULT_BACKUP_COMPONENTS
			];

			const job = createBackupLogged(
				client,
				guild,
				actor.id,
				selected,
				lang
			).then(
				({ data, count }) => ({
					started: false as const,
					backup: {
						id: data.id,
						components: data.components ?? [],
						incomplete: data.incomplete ?? [],
						createdAt: data.createdTimestamp
					},
					count,
					max: MAX_BACKUPS_PER_USER
				}),
				(error: unknown) => {
					if (error instanceof BackupLimitError)
						return fail(
							`backup limit reached (${MAX_BACKUPS_PER_USER} per user)`
						);
					if (error instanceof BackupBusyError)
						return fail(
							"a backup is already running for you or this server"
						);
					logger.err(`Backup creation failed: ${error}`);
					return fail("the backup could not be created");
				}
			);
			let timer: ReturnType<typeof setTimeout> | undefined;
			const late = new Promise<{ started: true }>((resolve) => {
				timer = setTimeout(
					() => resolve({ started: true }),
					CREATE_WAIT_MS
				);
			});
			// Still running: it ends on its own, its errors are logged.
			job.catch(() => undefined);
			try {
				return await Promise.race([job, late]);
			} finally {
				clearTimeout(timer);
			}
		}
	},

	// /backup load: in the background; the result goes by DM, as the command
	// does when the channels are restored.
	"backups.load": {
		command: "backup load",
		run: async ({ client, guild, actor, params, lang }) => {
			const backupID = params.str("id", { max: 32 });
			const prepared = await prepareBackupLoad(
				client,
				guild,
				actor.id,
				backupID
			);
			if (!prepared.ok) return fail(BACKUP_LOAD_ERRORS[prepared.reason]);
			if (client.backup.isGuildBusy(guild.id))
				return fail(
					"a backup operation is already running on this server"
				);
			const wanted = components(params, "components");
			const selected = wanted
				? wanted.filter((c) => prepared.available.includes(c))
				: prepared.available;
			if (!selected.length)
				return fail("this backup holds none of these components");

			const signature = await botSignature(client, guild.id);
			void runBackupLoad(
				client,
				lang,
				guild,
				prepared.backup.data,
				backupID,
				selected,
				signature
			)
				.then(async (card) => {
					await actor.user
						.send(cardPayload(card) as never)
						.catch(() => undefined);
				})
				.catch((error) => logger.err(`Backup load failed: ${error}`));
			return { started: true, components: selected };
		}
	},

	// /backup delete: only the author's own backups.
	"backups.delete": {
		command: "backup delete",
		run: async ({ client, actor, params }) => {
			const backupID = params.str("id", { max: 32 });
			const index = await client.backup.getUserBackups(actor.id);
			if (!Object.hasOwn(index, backupID))
				return fail("backup not found");
			await client.backup.removeForUser(actor.id, backupID);
			return { deleted: true, id: backupID };
		}
	},

	// /backup schedule: the server owner only, like the command.
	"backups.schedules": {
		read: true,
		command: "backup schedule",
		ownerOnly: true,
		run: async ({ client, guild }) => {
			const current = await client.backup.getSchedule(guild.id);
			return {
				schedule: current
					? {
							frequency: frequencyKey(current),
							every: current.every,
							unit: current.unit,
							components: normalizeComponents(current.components),
							nextRunAt: current.nextRunAt,
							lastRunAt: current.lastRunAt ?? null,
							lastError: current.lastError ?? null
						}
					: null,
				frequencies: Object.keys(BACKUP_FREQUENCIES),
				defaultComponents: DEFAULT_BACKUP_COMPONENTS,
				maxAuto: MAX_AUTO_BACKUPS_PER_GUILD
			};
		}
	},

	"backups.schedule": {
		command: "backup schedule",
		ownerOnly: true,
		run: async ({ client, guild, actor, params }) => {
			if (!params.bool("enabled", true)) {
				await client.backup.removeSchedule(guild.id);
				return { schedule: null };
			}
			const current = await client.backup.getSchedule(guild.id);
			const key = params.oneOf(
				"frequency",
				Object.keys(BACKUP_FREQUENCIES) as BackupFrequencyKey[],
				(current && frequencyKey(current)) || "1w"
			);
			const selected =
				components(params, "components") ??
				(current
					? normalizeComponents(current.components)
					: [...DEFAULT_BACKUP_COMPONENTS]);
			const schedule = buildSchedule(
				actor.id,
				BACKUP_FREQUENCIES[key],
				selected,
				current
			);
			await client.backup.saveSchedule(guild.id, schedule);
			return {
				schedule: {
					frequency: key,
					every: schedule.every,
					unit: schedule.unit,
					components: schedule.components,
					nextRunAt: schedule.nextRunAt,
					lastRunAt: schedule.lastRunAt ?? null,
					lastError: null
				}
			};
		}
	},

	// --- AutoMod (the /automod panel) ----------------------------------------------

	"automod.state": {
		read: true,
		command: "automod",
		run: async (ctx) => {
			const { rules } = await automodReady(ctx);
			return {
				rules: automodView(rules),
				defaultMentionLimit: DEFAULT_MENTION_LIMIT,
				maxMentionLimit: MAX_MENTION_LIMIT
			};
		}
	},

	// Same order as the panel: stored settings first, then the switch.
	"automod.set": {
		command: "automod",
		run: async (ctx) => {
			const { client, guild, actor, params } = ctx;
			const key = params.oneOf("rule", RULE_ORDER) as AutomodRuleKey;
			const enabled = params.has("enabled")
				? params.bool("enabled")
				: null;

			let bypass: string[] | null = null;
			if (params.raw_("bypassRoles") !== undefined) {
				// The panel's role picker takes 10 at most.
				bypass =
					params.raw_("bypassRoles") === null
						? []
						: params.ids("bypassRoles", 10);
				for (const id of bypass) {
					if (id === guild.id || !guild.roles.cache.has(id))
						return fail(`role ${id} not found`);
				}
			}

			let logs: string | null | undefined = undefined;
			if (params.raw_("logsChannel") !== undefined) {
				logs = params.optId("logsChannel");
				if (logs) {
					const channel = guild.channels.cache.get(logs);
					if (!channel || channel.type !== ChannelType.GuildText)
						return fail("channel not found");
					// Like the panel's picker: only channels the author sees.
					if (
						!channel
							.permissionsFor(actor)
							?.has(PermissionFlagsBits.ViewChannel)
					)
						return fail("forbidden: you cannot see this channel");
				}
			}

			const limit = params.has("mentionLimit")
				? params.int("mentionLimit", { min: 1, max: MAX_MENTION_LIMIT })
				: null;
			if (limit !== null && key !== "mass_mention")
				return fail("mentionLimit only applies to mass_mention");

			let state = await automodReady(ctx);
			try {
				if (bypass) {
					await saveAutomodBypass(
						guild,
						client.db,
						key,
						bypass,
						state.native[key]
					);
				}
				if (logs !== undefined) {
					await saveAutomodLogs(
						guild,
						client.db,
						key,
						logs,
						state.native[key],
						state.rules[key].enabled
					);
				}
				state = await loadAutomodState(guild, client.db);
				const existing = state.native[key];
				if (enabled === true) {
					await enableAutomodRule(guild, client.db, key, existing, {
						...state.rules[key],
						mentionLimit: limit ?? state.rules[key].mentionLimit
					});
				} else if (enabled === false) {
					await disableAutomodRule(guild, client.db, key, existing);
				} else if (limit !== null) {
					if (!existing)
						return fail("enable the rule to set its mention limit");
					await existing.edit({
						triggerMetadata: { mentionTotalLimit: limit }
					});
				}
				state = await loadAutomodState(guild, client.db);
			} catch (error) {
				if (error instanceof ActionError) throw error;
				logger.err(error);
				return fail("Discord refused the AutoMod change");
			}
			return {
				rule: automodView(state.rules).find((r) => r.key === key)
			};
		}
	},

	// --- The bot's profile on this server (/custom) ------------------------------
	// Name and avatar go through the dashboard config (BOT.botName / botPFP).

	"bot.profile": {
		read: true,
		command: "custom bio",
		run: async ({ client, guild }) => {
			const me =
				guild.members.me ??
				(await guild.members.fetchMe().catch(() => null));
			if (!me) return fail("the bot is not on this server");
			return {
				id: me.id,
				name: me.displayName,
				nickname: me.nickname,
				avatar: me.avatarURL({ size: 256 }),
				defaultAvatar: client.user!.displayAvatarURL({ size: 256 }),
				banner: me.bannerURL({ size: 1024 }),
				// Discord does not return the server bio of a member: only the
				// one /custom bio reset puts back is known.
				defaultBio:
					((await metasTable.get("BOT.user.bio")) as string | null) ||
					client.user!.username,
				maxBioLength: MAX_CUSTOM_BIO_LENGTH,
				maxBannerBytes: MAX_BANNER_BYTES
			};
		}
	},

	// `bio` / `banner`: a value sets it, null resets it like the commands'
	// "reset" action, absent leaves it.
	"bot.profile-set": {
		command: "custom bio",
		run: async (ctx) => {
			const { guild, params } = ctx;
			const bioRaw = params.raw_("bio");
			const bannerRaw = params.raw_("banner");
			if (bioRaw === undefined && bannerRaw === undefined)
				return fail("nothing to change");

			let bio: string | null | undefined;
			if (bioRaw !== undefined) {
				if (bioRaw === null || bioRaw === "") bio = null;
				else if (typeof bioRaw !== "string")
					return fail("invalid parameter: bio");
				else if (bioRaw.length > MAX_CUSTOM_BIO_LENGTH)
					return fail(
						`bio is longer than ${MAX_CUSTOM_BIO_LENGTH} characters`
					);
				else bio = bioRaw;
			}
			let banner: Buffer | null | undefined;
			if (bannerRaw !== undefined) {
				await authorizeAlso(ctx, "custom banner", { read: false });
				banner =
					bannerRaw === null || bannerRaw === ""
						? null
						: decodeImage(bannerRaw, "banner", MAX_BANNER_BYTES)
								.buffer;
			}

			const result: { bio?: "set" | "reset"; banner?: "set" | "reset" } =
				{};
			if (bio !== undefined) {
				const ok =
					bio === null
						? await resetGuildBotBio(guild)
						: await changeGuildBotBio(guild, bio);
				if (!ok) return fail("Discord refused the bio");
				result.bio = bio === null ? "reset" : "set";
			}
			if (banner !== undefined) {
				const ok =
					banner === null
						? await resetGuildBotBanner(guild).catch(() => false)
						: await changeGuildBotBanner(
								guild,
								bannerDataUri(banner)
							);
				if (!ok) return fail("Discord refused the banner");
				result.banner = banner === null ? "reset" : "set";
			}
			return result;
		}
	}
};
