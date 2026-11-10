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

// Dashboard actions of the moderation commands (`/mod …`, `/channel …`,
// `/unban-all …`, `/utils derank|addrole|delrole|massiverole`,
// `/util sync`). The work and the guards are the commands' own, shared
// through `moderationOps.ts` / `channelLock.ts`; only the refusal messages
// differ (English for the dashboard).

import {
	BaseGuildTextChannel,
	CategoryChannel,
	ChannelType,
	GuildBasedChannel,
	GuildMember,
	PermissionFlagsBits,
	Role,
	User
} from "discord.js";
import {
	applyAllChannelsLock,
	applyChannelLock,
	sendChannelLockLog
} from "../channelLock.js";
import {
	banUser,
	BanRefusal,
	bulkClear,
	checkRoleChange,
	clearWarns,
	derankPlan,
	derankRun,
	getAllWarns,
	getBanInfo,
	getMutedMembers,
	getWarns,
	kickMember,
	massRolePlan,
	massRoleRun,
	MAX_MUTE_MS,
	removeWarn,
	RoleChangeRefusal,
	RoleRefusal,
	selectMessagesToClear,
	sendUnwarnLog,
	setAllChannelsHidden,
	setChannelHidden,
	syncCategory,
	tempmuteMember,
	TempmuteRefusal,
	unbanAll,
	unbanUser,
	undoUnbanAll,
	unmuteAll,
	unmuteMember,
	UnmuteRefusal
} from "../moderationOps.js";
import { ActionContext, ActionGroup, fail } from "./types.js";

export const REASON_MAX = 400;
export const WARN_REASON_MAX = 1000;
export const WARNS_PAGE = 100;
export const WARNS_PER_USER_MAX = 500;
export const MUTES_MAX = 500;
export const BANS_PAGE_MAX = 100;
export const PURGE_MAX = 100;
export const MIN_MUTE_MS = 1000;
// Jobs that may be long answer after this delay and go on in the background
// (the gateway waits 10 s).
export const INLINE_BUDGET_MS = 8_000;

/* ------------------------------- helpers ------------------------------ */

const userInfo = (u: User) => ({
	id: u.id,
	username: u.username,
	globalName: u.globalName ?? null,
	avatar: u.displayAvatarURL({ size: 64 })
});

const memberInfo = (m: GuildMember) => ({
	id: m.id,
	username: m.user.username,
	displayName: m.displayName,
	avatar: m.displayAvatarURL({ size: 64 })
});

async function fetchMember(
	ctx: ActionContext,
	key = "userId"
): Promise<GuildMember> {
	const id = ctx.params.id(key);
	const member = await ctx.guild.members.fetch(id).catch(() => null);
	if (!member) return fail("member not found");
	return member;
}

async function fetchUser(ctx: ActionContext, key = "userId"): Promise<User> {
	const id = ctx.params.id(key);
	const user = await ctx.client.users.fetch(id).catch(() => null);
	if (!user) return fail("user not found");
	return user;
}

function roleParam(ctx: ActionContext, key = "roleId"): Role {
	const id = ctx.params.id(key);
	const role = ctx.guild.roles.cache.get(id);
	if (!role) return fail("role not found");
	return role;
}

// The role an overwrite targets: the one given, else @everyone.
function overwriteTarget(ctx: ActionContext): string {
	return ctx.params.has("roleId") ? roleParam(ctx).id : ctx.guild.id;
}

// A channel of this guild that carries permission overwrites (no thread),
// that the actor sees and where the actor has `perms` — as when running the
// command from inside that channel.
export function channelParam(
	ctx: ActionContext,
	perms: bigint[] = [],
	key = "channelId"
): GuildBasedChannel & BaseGuildTextChannel {
	const id = ctx.params.id(key);
	const channel = ctx.guild.channels.cache.get(id);
	if (!channel || channel.isThread() || !("permissionOverwrites" in channel))
		return fail("channel not found");
	const actorPerms = channel.permissionsFor(ctx.actor);
	if (!actorPerms?.has(PermissionFlagsBits.ViewChannel))
		return fail("forbidden: you can't see this channel");
	if (perms.length > 0 && !actorPerms.has(perms))
		return fail("forbidden: you lack permissions in this channel");
	return channel as GuildBasedChannel & BaseGuildTextChannel;
}

// The job's result if it ends within the budget, else `{ started: true }`
// while it goes on.
export async function withinBudget<T>(
	job: Promise<T>,
	budgetMs = INLINE_BUDGET_MS
): Promise<T | { started: true }> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const late = new Promise<{ started: true }>((resolve) => {
		timer = setTimeout(() => resolve({ started: true }), budgetMs);
	});
	job.catch(() => {});
	try {
		return await Promise.race([job, late]);
	} finally {
		clearTimeout(timer);
	}
}

const BOT_PERM = "the bot lacks the permission to do this";

export function roleRefusalMessage(refusal: RoleRefusal): string {
	switch (refusal.code) {
		case "managed_or_everyone":
			return "this role is managed by an integration or is @everyone";
		case "too_high_bot":
			return "this role is above the bot's highest role";
		case "too_high_user":
			return "forbidden: this role is not below your highest role";
		case "missing_permissions":
			return `forbidden: this role has permissions you don't have (${refusal.missing.join(", ")})`;
	}
}

export const BAN_ERRORS: Record<BanRefusal, string> = {
	bot_missing_permission: BOT_PERM,
	self: "you can't ban yourself",
	target_above_author:
		"forbidden: this member is not below your highest role",
	not_bannable: "the bot can't ban this member (role hierarchy)",
	failed: "Discord refused the ban"
};

export const KICK_ERRORS: Record<
	"bot_missing_permission" | "self" | "target_above_author" | "failed",
	string
> = {
	bot_missing_permission: BOT_PERM,
	self: "you can't kick yourself",
	target_above_author:
		"forbidden: this member is not below your highest role",
	failed: "Discord refused the kick"
};

export const TEMPMUTE_ERRORS: Record<TempmuteRefusal, string> = {
	bot_missing_permission: BOT_PERM,
	target_is_admin: "administrators can't be muted",
	target_above_bot: "this member is not below the bot's highest role",
	target_above_author:
		"forbidden: this member is not below your highest role",
	self: "you can't mute yourself",
	already_muted: "this member is already muted",
	failed: "Discord refused the timeout"
};

export const UNMUTE_ERRORS: Record<UnmuteRefusal, string> = {
	bot_missing_permission: BOT_PERM,
	self: "you can't unmute yourself",
	target_above_author:
		"forbidden: this member is not below your highest role",
	not_muted: "this member is not muted",
	failed: "Discord refused to remove the timeout"
};

export const ROLE_CHANGE_ERRORS: Record<
	Exclude<RoleChangeRefusal, "role_refused">,
	string
> = {
	not_whitelisted: "forbidden: this role is not in the server's whitelist",
	bot_not_admin: "the bot needs the Administrator permission",
	target_above_author:
		"forbidden: this member is not below your highest role",
	admin_role: "an administrator role can only be given to an administrator",
	role_above_bot: "this role is above the bot's highest role"
};

const reasonParam = (ctx: ActionContext, max = REASON_MAX) =>
	ctx.params.optStr("reason", max);

/* ------------------------------- actions ------------------------------ */

export const moderationActions: ActionGroup = {
	/* warns */

	// One member's warns, or every member that has some (paged).
	"warns.list": {
		read: true,
		command: "mod warnlist",
		run: async (ctx) => {
			const { guild, params } = ctx;
			const userId = params.optId("userId");
			if (userId) {
				const warns = await getWarns(guild, userId);
				const member = guild.members.cache.get(userId);
				return {
					userId,
					member: member ? memberInfo(member) : null,
					total: warns.length,
					// Newest first.
					warns: warns
						.slice(-WARNS_PER_USER_MAX)
						.reverse()
						.map((w) => ({
							id: w.id,
							reason: w.reason,
							authorId: w.authorID,
							at: w.timestamp
						}))
				};
			}
			const page = params.int("page", { min: 0, max: 10_000, def: 0 });
			const all = (await getAllWarns(guild))
				.map((x) => ({
					userId: x.userId,
					count: x.warns.length,
					lastAt: Math.max(...x.warns.map((w) => w.timestamp || 0))
				}))
				.sort((a, b) => b.lastAt - a.lastAt);
			const slice = all.slice(page * WARNS_PAGE, (page + 1) * WARNS_PAGE);
			return {
				total: all.length,
				page,
				nextPage:
					(page + 1) * WARNS_PAGE < all.length ? page + 1 : null,
				users: slice.map((x) => {
					const member = guild.members.cache.get(x.userId);
					return { ...x, member: member ? memberInfo(member) : null };
				})
			};
		}
	},

	"warns.add": {
		command: "mod warn",
		run: async (ctx) => {
			const member = await fetchMember(ctx);
			const reason = ctx.params.str("reason", { max: WARN_REASON_MAX });
			const warnId = await ctx.client.func.method.warnMember(
				ctx.actor,
				member,
				reason,
				ctx.lang
			);
			return { warnId };
		}
	},

	"warns.remove": {
		command: "mod unwarn",
		run: async (ctx) => {
			const userId = ctx.params.id("userId");
			const warnId = ctx.params.str("warnId", { max: 64 });
			const result = await removeWarn(ctx.guild, userId, warnId);
			if (!result.ok)
				return fail(
					result.code === "no_warns"
						? "this member has no warns"
						: "warn not found"
				);
			await sendUnwarnLog(
				ctx.guild,
				ctx.actor.toString(),
				`<@${userId}>`,
				result.removed,
				ctx.lang
			);
			return { removed: result.removed.id };
		}
	},

	"warns.clear": {
		command: "mod clearwarn",
		run: async (ctx) => {
			const userId = ctx.params.id("userId");
			const result = await clearWarns(ctx.guild, userId);
			if (!result.ok) return fail("this member has no warns");
			return { cleared: result.count };
		}
	},

	/* mutes */

	"mutes.list": {
		read: true,
		command: "mod mutelist",
		run: async ({ guild }) => {
			const muted = getMutedMembers(guild);
			return {
				total: muted.length,
				members: muted.slice(0, MUTES_MAX).map((m) => ({
					...memberInfo(m),
					until: m.communicationDisabledUntilTimestamp
				}))
			};
		}
	},

	"mutes.add": {
		command: "mod tempmute",
		run: async (ctx) => {
			const target = await fetchMember(ctx);
			let ms = ctx.params.int("duration", { min: MIN_MUTE_MS });
			const reason = reasonParam(ctx);
			const capped = ms > MAX_MUTE_MS;
			if (capped) ms = MAX_MUTE_MS;
			const result = await tempmuteMember(
				ctx.actor,
				target,
				ms,
				ctx.client.timeCalculator.to_beautiful_string(ms, ctx.lang),
				reason,
				ctx.lang
			);
			if (!result.ok) return fail(TEMPMUTE_ERRORS[result.code]);
			return { mutedUntil: result.mutedUntil, capped };
		}
	},

	"mutes.remove": {
		command: "mod unmute",
		run: async (ctx) => {
			const target = await fetchMember(ctx);
			const result = await unmuteMember(ctx.actor, target, ctx.lang);
			if (!result.ok) return fail(UNMUTE_ERRORS[result.code]);
			return { ok: true };
		}
	},

	// One timeout edit per member, in a row: may outlast the budget.
	"mutes.clear": {
		command: "mod unmuteall",
		run: async (ctx) => {
			const job = unmuteAll(ctx.actor, ctx.lang).then((result) => {
				if (!result.ok)
					return fail(
						result.code === "nobody_muted"
							? "no muted member below you"
							: BOT_PERM
					);
				return { unmuted: result.unmuted, total: result.total };
			});
			return withinBudget(job);
		}
	},

	/* bans */

	// Paged by user id (Discord's order): `after` = last id of the page.
	"bans.list": {
		read: true,
		command: "mod banlist",
		run: async ({ guild, params }) => {
			const limit = params.int("limit", {
				min: 1,
				max: BANS_PAGE_MAX,
				def: 50
			});
			const after = params.optId("after");
			const bans = await guild.bans
				.fetch({ limit, ...(after ? { after } : {}), cache: false })
				.catch(() => fail("can't read the bans (missing permission?)"));
			const list = [...bans.values()];
			return {
				bans: list.map((b) => ({
					...userInfo(b.user),
					reason: b.reason ?? null
				})),
				nextCursor:
					list.length === limit ? list[list.length - 1].user.id : null
			};
		}
	},

	"bans.info": {
		read: true,
		command: "mod baninfo",
		run: async ({ guild, params }) => {
			const userId = params.id("userId");
			const info = await getBanInfo(guild, userId);
			if (!info) return fail("ban not found");
			return {
				...userInfo(info.ban.user),
				reason: info.ban.reason ?? null,
				bannedAt: info.bannedAt,
				executor: info.executor
					? {
							id: info.executor.id,
							username: info.executor.username ?? null
						}
					: null
			};
		}
	},

	"bans.add": {
		command: "mod ban",
		run: async (ctx) => {
			const user = await fetchUser(ctx);
			const reason =
				reasonParam(ctx) ?? ctx.lang.guildprofil_not_set_punishPub;
			const result = await banUser(ctx.actor, user, reason, ctx.lang);
			if (!result.ok) return fail(BAN_ERRORS[result.code]);
			return { ok: true };
		}
	},

	"bans.remove": {
		command: "mod unban",
		run: async (ctx) => {
			const userId = ctx.params.id("userId");
			const reason = reasonParam(ctx) ?? ctx.lang.unban_reason;
			const result = await unbanUser(ctx.actor, userId, reason, ctx.lang);
			if (!result.ok)
				return fail(
					result.code === "not_banned" ? "ban not found" : BOT_PERM
				);
			return { ok: true };
		}
	},

	// Background job (5 unbans / 200 ms); `undo` bans them again.
	"bans.remove-all": {
		command: "unban-all all",
		run: async ({ guild }) => {
			const result = await unbanAll(guild);
			if (!result.ok)
				return fail(
					result.code === "busy"
						? "an unban-all is already running on this server"
						: "nobody is banned"
				);
			return { started: true, total: result.total };
		}
	},

	"bans.undo-remove-all": {
		command: "unban-all undo",
		run: async ({ guild }) => {
			const result = await undoUnbanAll(guild);
			if (!result.ok)
				return fail(
					result.code === "busy"
						? "an unban-all is already running on this server"
						: "nothing to undo"
				);
			return { started: true, total: result.total };
		}
	},

	/* members */

	"members.kick": {
		command: "mod kick",
		run: async (ctx) => {
			const target = await fetchMember(ctx);
			const reason =
				reasonParam(ctx) ?? ctx.lang.guildprofil_not_set_punishPub;
			const result = await kickMember(
				ctx.actor,
				target,
				reason,
				ctx.lang
			);
			if (!result.ok) return fail(KICK_ERRORS[result.code]);
			return { ok: true };
		}
	},

	"members.derank": {
		command: "utils derank",
		run: async (ctx) => {
			const target = await fetchMember(ctx);
			const plan = derankPlan(ctx.actor, target);
			if (!plan.ok)
				return fail(
					plan.code === "no_role"
						? "this member has no role"
						: "forbidden: this member is not below your highest role"
				);
			return withinBudget(derankRun(target, plan.roles));
		}
	},

	"members.add-role": {
		command: "utils addrole",
		run: (ctx) => changeRole(ctx, true)
	},

	"members.remove-role": {
		command: "utils delrole",
		run: (ctx) => changeRole(ctx, false)
	},

	/* roles */

	// Background job (10 members / 150 ms): answers with the plan only.
	"roles.mass": {
		command: "utils massiverole",
		run: async (ctx) => {
			const role = roleParam(ctx);
			const adding = ctx.params.oneOf("op", ["add", "remove"]) === "add";
			const plan = await massRolePlan(ctx.actor, role, adding);
			if (!plan.ok) {
				if (plan.code === "role_refused")
					return fail(roleRefusalMessage(plan.refusal));
				return fail(
					plan.code === "busy"
						? "a mass role change is already running on this server"
						: "this server has too many members for a mass role change"
				);
			}
			setImmediate(() => {
				massRoleRun(plan.members, role, adding, plan.release).catch(
					() => {}
				);
			});
			return {
				started: true,
				total: plan.members.length,
				skipped: plan.skipped
			};
		}
	},

	/* messages */

	// With `userId`, scans up to the last 1000 messages (a few seconds).
	"messages.purge": {
		command: "mod clear",
		run: async (ctx) => {
			const channel = channelParam(ctx, [
				PermissionFlagsBits.ManageMessages
			]);
			if (!("bulkDelete" in channel) || !channel.isTextBased())
				return fail("this channel has no messages");
			const amount = ctx.params.int("amount", { min: 1, max: PURGE_MAX });
			const memberId = ctx.params.optId("userId");
			const job = (async () => {
				const selected = await selectMessagesToClear(
					channel,
					amount,
					memberId
				);
				if (selected === null) return { deleted: 0 };
				const deleted = await bulkClear(
					channel,
					selected,
					ctx.actor.id,
					ctx.lang
				).catch(() => fail("Discord refused to delete the messages"));
				return { deleted };
			})();
			return withinBudget(job);
		}
	},

	/* channels */

	"channels.lock": {
		command: "mod lock",
		run: (ctx) => lockOne(ctx, "lock")
	},

	"channels.unlock": {
		command: "mod unlock",
		run: (ctx) => lockOne(ctx, "unlock")
	},

	"channels.lock-all": {
		command: "mod lock-all",
		run: (ctx) => lockAll(ctx, "lock")
	},

	"channels.unlock-all": {
		command: "mod unlock-all",
		run: (ctx) => lockAll(ctx, "unlock")
	},

	"channels.hide": {
		command: "channel hide",
		run: (ctx) => hideOne(ctx, true)
	},

	"channels.unhide": {
		command: "channel unhide",
		run: (ctx) => hideOne(ctx, false)
	},

	// One overwrite edit per text channel, in a row.
	"channels.hide-all": {
		command: "channel hideall",
		run: (ctx) => hideAll(ctx, true)
	},

	"channels.unhide-all": {
		command: "channel unhideall",
		run: (ctx) => hideAll(ctx, false)
	},

	"channels.sync": {
		command: "util sync",
		run: async (ctx) => {
			const id = ctx.params.id("categoryId");
			const category = ctx.guild.channels.cache.get(id);
			if (!category || category.type !== ChannelType.GuildCategory)
				return fail("category not found");
			if (
				!category
					.permissionsFor(ctx.actor)
					?.has(PermissionFlagsBits.ViewChannel)
			)
				return fail("forbidden: you can't see this category");
			const job = syncCategory(category as CategoryChannel)
				.then((synced) => ({ synced }))
				.catch(() => fail("the bot can't sync this category"));
			return withinBudget(job);
		}
	}
};

async function changeRole(ctx: ActionContext, adding: boolean) {
	const target = await fetchMember(ctx);
	const role = roleParam(ctx);
	const check = await checkRoleChange(ctx.actor, target, role, adding);
	if (!check.ok)
		return fail(
			check.code === "role_refused"
				? roleRefusalMessage(check.refusal)
				: ROLE_CHANGE_ERRORS[check.code]
		);
	const reason = `[${adding ? "AddRole" : "DelRole"}] Author: ${ctx.actor.id}`;
	const done = await (
		adding
			? target.roles.add(role.id, reason)
			: target.roles.remove(role.id, reason)
	)
		.then(() => true)
		.catch(() => false);
	if (!done) return fail("Discord refused the role change");
	return { ok: true };
}

async function lockOne(ctx: ActionContext, mode: "lock" | "unlock") {
	const channel = channelParam(ctx);
	const targetId = overwriteTarget(ctx);
	const done = await applyChannelLock(channel, targetId, mode)
		.then(() => true)
		.catch(() => false);
	if (!done) return fail("the bot can't edit this channel's permissions");
	await sendChannelLockLog(
		ctx.guild,
		ctx.lang,
		mode,
		ctx.actor.id,
		channel.id
	);
	return { ok: true };
}

async function lockAll(ctx: ActionContext, mode: "lock" | "unlock") {
	const targetId = overwriteTarget(ctx);
	const channels = await applyAllChannelsLock(
		ctx.guild,
		ctx.lang,
		targetId,
		mode,
		ctx.actor.id
	);
	return { channels };
}

async function hideOne(ctx: ActionContext, hidden: boolean) {
	const channel = channelParam(ctx, [PermissionFlagsBits.ManageChannels]);
	const targetId = overwriteTarget(ctx);
	const result = await setChannelHidden(channel, targetId, hidden);
	if (result === "not_manageable" || result === "failed")
		return fail("the bot can't edit this channel's permissions");
	return { changed: result === "ok" };
}

async function hideAll(ctx: ActionContext, hidden: boolean) {
	const targetId = overwriteTarget(ctx);
	return withinBudget(setAllChannelsHidden(ctx.guild, targetId, hidden));
}
