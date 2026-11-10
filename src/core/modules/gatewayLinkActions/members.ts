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

// Dashboard actions on members' data (invites, economy, levels, locked
// nicknames, leashes) and on voice channels. Each one does the work of a slash
// command through the same shared functions (`memberToolsManager.ts`), with
// the same guards and the same logs.

import {
	ChannelType,
	Guild,
	GuildMember,
	PermissionFlagsBits,
	StageChannel,
	VoiceBasedChannel,
	VoiceChannel
} from "discord.js";
import {
	activeLeashes,
	canManageNickLock,
	canMoveMember,
	canVoiceKick,
	categoryVoiceChannels,
	editMemberInvites,
	editMemberMoney,
	getLeashConfig,
	getLeashes,
	isEconomyDisabled,
	listLockNames,
	lockMemberName,
	massMoveSourceChannels,
	membersOfChannels,
	moveMembers,
	MoveReport,
	releaseLeash,
	resetGuildInvites,
	resetGuildSection,
	resetMemberSection,
	unlockMemberName
} from "../memberToolsManager.js";
import { ActionContext, ActionDef, ActionGroup, fail } from "./types.js";

// Amounts: the commands take any number; the dashboard sends integers.
export const MAX_INVITES_AMOUNT = 1_000_000;
export const MAX_MONEY_AMOUNT = 1_000_000_000;
// Members moved by one `voice.move`.
export const MAX_MOVE_USERS = 25;
// Long jobs answer after this delay and go on in the background (the gateway
// waits 10 s).
export const INLINE_BUDGET_MS = 8_000;
const LIST_PAGE = 100;
const VOICE_MEMBERS_PER_CHANNEL = 100;
const VOICE_CHANNELS_MAX = 200;

// `ihorizon_logs` only reads `.guild` of the interaction: same log channel.
function logs(
	{ client, guild }: ActionContext,
	embed: { title: string; description: string }
): Promise<void> {
	return client.func.ihorizon_logs({ guild }, embed);
}

async function fetchMember(guild: Guild, id: string): Promise<GuildMember> {
	const member = await guild.members.fetch(id).catch(() => null);
	if (!member) return fail("member not found");
	return member;
}

export function memberInfo(m: GuildMember) {
	return {
		id: m.id,
		username: m.user.username,
		displayName: m.displayName,
		avatar: m.displayAvatarURL({ size: 64 }),
		bot: m.user.bot
	};
}

// A voice channel of this guild the actor can see (the slash command's
// channel picker only offers those).
export function voiceChannelParam(
	ctx: ActionContext,
	key: string,
	types: readonly ChannelType[]
): VoiceBasedChannel {
	const id = ctx.params.id(key);
	const channel = ctx.guild.channels.cache.get(id);
	if (!channel || !(types as ChannelType[]).includes(channel.type)) {
		return fail("channel not found");
	}
	if (
		!channel.permissionsFor(ctx.actor)?.has(PermissionFlagsBits.ViewChannel)
	) {
		return fail("forbidden: you can't see this channel");
	}
	return channel as VoiceBasedChannel;
}

const VOICE = [ChannelType.GuildVoice, ChannelType.GuildStageVoice] as const;

// The job's result if it ends within the budget, else `{ started: true }`
// while it goes on.
export async function settle<T extends object>(
	job: Promise<T>,
	budgetMs = INLINE_BUDGET_MS
): Promise<(T & { done: true }) | { done: false; started: true }> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const late = new Promise<null>((resolve) => {
		timer = setTimeout(() => resolve(null), budgetMs);
	});
	job.catch(() => {});
	try {
		const result = await Promise.race([job, late]);
		return result === null
			? { done: false, started: true }
			: { ...result, done: true };
	} finally {
		clearTimeout(timer);
	}
}

const amount = (ctx: ActionContext, max: number) =>
	ctx.params.int("amount", { min: 1, max });

async function requireEconomy(ctx: ActionContext): Promise<void> {
	if (await isEconomyDisabled(ctx.client, ctx.guild.id)) {
		fail("the economy is disabled on this server");
	}
}

// `/inv addinvites`, `/inv removeinvites` (each with its own /perm rules).
const editInvites = (op: "add" | "remove"): ActionDef => ({
	command: op === "add" ? "inv addinvites" : "inv removeinvites",
	run: async (ctx) => {
		const n = amount(ctx, MAX_INVITES_AMOUNT);
		const member = await fetchMember(ctx.guild, ctx.params.id("userId"));
		const total = await editMemberInvites(
			ctx.client,
			ctx.guild.id,
			member.id,
			op,
			n
		);
		const l = ctx.lang;
		await logs(ctx, {
			title:
				op === "add"
					? l.addinvites_logs_embed_title
					: l.removeinvites_logs_embed_title,
			description: (op === "add"
				? l.addinvites_logs_embed_description
				: l.removeinvites_logs_embed_description
			)
				.replaceAll("${authorId}", ctx.actor.id)
				.replaceAll("${amount}", n.toString())
				.replaceAll("${userId}", member.id)
		});
		return { userId: member.id, invites: total };
	}
});

// `/economy balance-add`, `/economy balance-remove`.
const editMoney = (op: "add" | "remove"): ActionDef => ({
	command: op === "add" ? "economy balance-add" : "economy balance-remove",
	run: async (ctx) => {
		const n = amount(ctx, MAX_MONEY_AMOUNT);
		const member = await fetchMember(ctx.guild, ctx.params.id("userId"));
		await requireEconomy(ctx);
		const money = await editMemberMoney(
			ctx.client,
			ctx.guild.id,
			member.id,
			op,
			n
		);
		const l = ctx.lang;
		if (op === "add") {
			await logs(ctx, {
				title: l.addmoney_logs_embed_title,
				description: l.addmoney_logs_embed_description
					.replaceAll("${authorId}", ctx.actor.id)
					.replaceAll("${amountValue}", n.toString())
					.replaceAll("${userId}", member.id)
			});
			ctx.client.func.economyLogs.addMoney(
				ctx.guild,
				ctx.actor.id,
				member.id,
				n,
				l
			);
		} else {
			await logs(ctx, {
				title: l.removemoney_logs_embed_title,
				description: l.removemoney_logs_embed_description
					.replaceAll("${authorId}", ctx.actor.id)
					.replaceAll("${amount}", n.toString())
					.replaceAll("${userId}", member.id)
			});
			ctx.client.func.economyLogs.removeMoney(
				ctx.guild,
				ctx.actor.id,
				member.id,
				n,
				l
			);
		}
		return { userId: member.id, money };
	}
});

export const membersActions: ActionGroup = {
	// ── Invites ─────────────────────────────────────────────────────────────
	"invites.add": editInvites("add"),
	"invites.remove": editInvites("remove"),
	"invites.reset-all": {
		command: "inv reset",
		run: async (ctx) => {
			const members = await resetGuildInvites(ctx.client, ctx.guild.id);
			await logs(ctx, {
				title: ctx.lang.resetallinvites_logs_embed_title,
				description: ctx.lang.resetallinvites_logs_embed_desc.replace(
					"${author}",
					ctx.actor.toString()
				)
			});
			return { members };
		}
	},

	// ── Economy ─────────────────────────────────────────────────────────────
	"economy.add": editMoney("add"),
	"economy.remove": editMoney("remove"),
	"economy.reset": {
		command: "economy ureset",
		run: async (ctx) => {
			const userId = ctx.params.id("userId");
			await resetMemberSection(
				ctx.client,
				ctx.guild.id,
				userId,
				"ECONOMY"
			);
			await logs(ctx, {
				title: ctx.lang.reset_ueconomy_logs_embed_title,
				description: ctx.lang.reset_ueconomy_logs_embed_desc
					.replace("${author}", ctx.actor.toString())
					.replace("${user}", `<@${userId}>`)
			});
			return { userId };
		}
	},
	"economy.reset-all": {
		command: "economy greset",
		run: async (ctx) =>
			settle(
				(async () => {
					const members = await resetGuildSection(
						ctx.client,
						ctx.guild.id,
						"ECONOMY"
					);
					await logs(ctx, {
						title: ctx.lang.reset_geconomy_logs_embed_title,
						description:
							ctx.lang.reset_geconomy_logs_embed_desc.replace(
								"${author}",
								ctx.actor.toString()
							)
					});
					return { members };
				})()
			)
	},

	// ── Levels ──────────────────────────────────────────────────────────────
	"xp.reset": {
		command: "ranks ureset",
		run: async (ctx) => {
			const userId = ctx.params.id("userId");
			await resetMemberSection(
				ctx.client,
				ctx.guild.id,
				userId,
				"XP_LEVELING"
			);
			await logs(ctx, {
				title: ctx.lang.resetallinvites_logs_embed_title,
				description: ctx.lang.reset_uranks_logs_embed_desc
					.replace("${author}", ctx.actor.toString())
					.replace("${user}", `<@${userId}>`)
			});
			return { userId };
		}
	},
	"xp.reset-all": {
		command: "ranks greset",
		run: async (ctx) =>
			settle(
				(async () => {
					const members = await resetGuildSection(
						ctx.client,
						ctx.guild.id,
						"XP_LEVELING"
					);
					await logs(ctx, {
						title: ctx.lang.reset_uranks_logs_embed_title,
						description:
							ctx.lang.resetallinvites_logs_embed_desc.replace(
								"${author}",
								ctx.actor.toString()
							)
					});
					return { members };
				})()
			)
	},

	// ── Locked nicknames ────────────────────────────────────────────────────
	"locknames.list": {
		read: true,
		command: "utilss locknamelist",
		run: async (ctx) => {
			const all = await listLockNames(ctx.client, ctx.guild.id);
			const page = ctx.params.int("page", {
				min: 0,
				max: 10_000,
				def: 0
			});
			const slice = all.slice(page * LIST_PAGE, (page + 1) * LIST_PAGE);
			return {
				total: all.length,
				page,
				pages: Math.ceil(all.length / LIST_PAGE),
				entries: slice.map(([userId, data]) => {
					const m = ctx.guild.members.cache.get(userId);
					return {
						userId,
						member: m ? memberInfo(m) : null,
						nick: data.nick ?? null,
						lockedBy: data.lockedBy ?? null,
						// `/utilss lockname` stores ms; old entries may be in s.
						lockedAt: data.lockedAt
							? data.lockedAt > 1e12
								? data.lockedAt
								: data.lockedAt * 1000
							: null
					};
				})
			};
		}
	},
	"locknames.lock": {
		command: "utilss lockname",
		run: async (ctx) => {
			const member = await fetchMember(
				ctx.guild,
				ctx.params.id("userId")
			);
			const nick = ctx.params.optStr("nick", 100);
			const result = await lockMemberName(
				ctx.client,
				ctx.guild,
				ctx.actor,
				member,
				nick
			);
			if (!result.ok) {
				return fail(
					result.reason === "hierarchy"
						? "forbidden: this member is above you"
						: result.reason === "already_locked"
							? "this member's nickname is already locked"
							: "the bot can't change this member's nickname"
				);
			}
			await logs(ctx, {
				title: ctx.lang.util_lockname_logs_embed_title,
				description: ctx.lang.util_lockname_logs_embed_description
					.replace("${authorId}", ctx.actor.id)
					.replace("${memberId}", member.id)
			});
			return { userId: member.id, nick: result.nick };
		}
	},
	"locknames.unlock": {
		command: "utilss unlockname",
		run: async (ctx) => {
			const member = await fetchMember(
				ctx.guild,
				ctx.params.id("userId")
			);
			const result = await unlockMemberName(
				ctx.client,
				ctx.guild,
				ctx.actor,
				member
			);
			if (!result.ok) {
				return fail(
					result.reason === "hierarchy"
						? "forbidden: this member is above you"
						: "this member's nickname is not locked"
				);
			}
			await logs(ctx, {
				title: ctx.lang.util_lockname_logs_embed_title,
				description: ctx.lang.util_unlockname_logs_embed_description
					.replace("${authorId}", ctx.actor.id)
					.replace("${memberId}", member.id)
			});
			return { userId: member.id };
		}
	},

	// ── Leashes ─────────────────────────────────────────────────────────────
	"leashes.list": {
		read: true,
		command: "utilss leashlist",
		run: async (ctx) => {
			// Unlike `/utilss leashlist`, a read doesn't purge expired leashes.
			const cfg = await getLeashConfig(ctx.client, ctx.guild.id);
			const active = activeLeashes(
				await getLeashes(ctx.client, ctx.guild.id),
				cfg.maxLeashTime
			);
			return {
				maxLeashTime: cfg.maxLeashTime,
				maxLeashedByUsers: cfg.maxLeashedByUsers,
				total: active.length,
				entries: active.slice(0, 500).map((l) => ({
					domId: l.dom,
					subId: l.sub,
					since: l.timestamp,
					expiresAt: l.timestamp + cfg.maxLeashTime
				}))
			};
		}
	},
	"leashes.release": {
		// `/utils unleash`: the actor releases a member THEY hold.
		command: "utils unleash",
		run: async (ctx) => {
			const subId = ctx.params.id("userId");
			if (
				!(await releaseLeash(
					ctx.client,
					ctx.guild.id,
					ctx.actor.id,
					subId
				))
			) {
				return fail("leash not found");
			}
			return { userId: subId };
		}
	},

	// ── Voice ───────────────────────────────────────────────────────────────
	"voice.overview": {
		read: true,
		command: "util where",
		run: async (ctx) => {
			const sessions = ((await ctx.client.db.get(
				`${ctx.guild.id}.ACTIVE_VOICE_SESSIONS`
			)) || {}) as Record<string, { startTimestamp?: number }>;
			const channels = Array.from(ctx.guild.channels.cache.values())
				.filter(
					(c): c is VoiceChannel | StageChannel =>
						(c.type === ChannelType.GuildVoice ||
							c.type === ChannelType.GuildStageVoice) &&
						c.members.size > 0 &&
						!!c
							.permissionsFor(ctx.actor)
							?.has(PermissionFlagsBits.ViewChannel)
				)
				.sort((a, b) => a.rawPosition - b.rawPosition)
				.slice(0, VOICE_CHANNELS_MAX);
			return {
				channels: channels.map((c) => ({
					id: c.id,
					name: c.name,
					type:
						c.type === ChannelType.GuildStageVoice
							? "stage"
							: "voice",
					parentId: c.parentId,
					userLimit: c.userLimit,
					memberCount: c.members.size,
					members: Array.from(c.members.values())
						.slice(0, VOICE_MEMBERS_PER_CHANNEL)
						.map((m) => ({
							...memberInfo(m),
							...voiceFlags(m),
							since: sessions[m.id]?.startTimestamp ?? null
						}))
				}))
			};
		}
	},
	"voice.where": {
		read: true,
		command: "util where",
		run: async (ctx) => {
			const member = await fetchMember(
				ctx.guild,
				ctx.params.id("userId")
			);
			const channel = member.voice.channel;
			// A channel the actor can't see stays unnamed (the slash command
			// only sends a mention, which Discord hides in that case).
			if (
				!channel ||
				!channel
					.permissionsFor(ctx.actor)
					?.has(PermissionFlagsBits.ViewChannel)
			) {
				return { member: memberInfo(member), channel: null };
			}
			const session = (await ctx.client.db.get(
				`${ctx.guild.id}.ACTIVE_VOICE_SESSIONS.${member.id}`
			)) as { startTimestamp?: number } | null;
			return {
				member: memberInfo(member),
				channel: { id: channel.id, name: channel.name },
				...voiceFlags(member),
				since: session?.startTimestamp ?? null
			};
		}
	},
	"voice.move": {
		command: "util move",
		run: async (ctx) => {
			const ids = ctx.params.has("userIds")
				? ctx.params.ids("userIds", MAX_MOVE_USERS)
				: [ctx.params.id("userId")];
			if (ids.length === 0) return fail("missing parameter: userIds");
			const to = voiceChannelParam(ctx, "toChannelId", VOICE);
			const members: GuildMember[] = [];
			for (const id of ids) {
				const m = await fetchMember(ctx.guild, id);
				if (!m.voice.channelId) {
					return fail("this member is not in a voice channel");
				}
				if (!canMoveMember(ctx.actor, m)) {
					return fail(
						"forbidden: only an administrator can move an administrator"
					);
				}
				members.push(m);
			}
			return settle(
				moveMembers(members, () => to).then((r) => ({
					...r,
					total: members.length
				}))
			);
		}
	},
	"voice.move-all": {
		// `/utils massmove from:… channel:…`
		command: "utils massmove",
		run: async (ctx) => {
			const from = voiceChannelParam(ctx, "fromChannelId", [
				ChannelType.GuildVoice
			]);
			const to = voiceChannelParam(ctx, "toChannelId", [
				ChannelType.GuildVoice
			]);
			return massMove(membersOfChannels([from]), to);
		}
	},
	"voice.bring-all": {
		// `/utils massmove channel:…` (no `from`): every voice channel.
		command: "utils massmove",
		run: async (ctx) => {
			const to = voiceChannelParam(ctx, "toChannelId", [
				ChannelType.GuildVoice
			]);
			return massMove(
				membersOfChannels(massMoveSourceChannels(ctx.guild)),
				to
			);
		}
	},
	"voice.spread": {
		// `/util bringall`: members of one channel spread at random over the
		// voice channels of a category.
		command: "util bringall",
		run: async (ctx) => {
			const from = voiceChannelParam(ctx, "fromChannelId", VOICE);
			const categoryId = ctx.params.id("categoryId");
			const category = ctx.guild.channels.cache.get(categoryId);
			if (!category || category.type !== ChannelType.GuildCategory) {
				return fail("category not found");
			}
			// The actor must see the category and the channels members land in
			// (as for `from`/`to` of the other moves: the picker offers those).
			if (
				!category
					.permissionsFor(ctx.actor)
					.has(PermissionFlagsBits.ViewChannel)
			) {
				return fail("category not found");
			}
			const targets = categoryVoiceChannels(category).filter((c) =>
				c.permissionsFor(ctx.actor).has(PermissionFlagsBits.ViewChannel)
			);
			if (targets.length === 0) {
				return fail("this category has no voice channel");
			}
			const members = Array.from(from.members.values());
			if (members.length === 0) {
				return fail("nobody is in this voice channel");
			}
			members.sort(
				() => ctx.client.func.random.secureRandomFloat() - 0.5
			);
			return settle(
				moveMembers(members, (i) => targets[i % targets.length]).then(
					(r) => ({ ...r, total: members.length })
				)
			);
		}
	},
	"voice.kick": {
		command: "util vkick",
		run: async (ctx) => {
			const member = await fetchMember(
				ctx.guild,
				ctx.params.id("userId")
			);
			const channel = member.voice.channel;
			if (!channel) {
				return fail("this member is not in a voice channel");
			}
			if (!canVoiceKick(member)) {
				return fail("forbidden: administrators can't be voice-kicked");
			}
			await member.voice.setChannel(null);
			await logs(ctx, {
				title: ctx.lang.vkick_logEmbed_title,
				description: ctx.lang.vkick_logEmbed_desc
					.replace("${author}", ctx.actor.toString())
					.replace("${member}", member.toString())
					.replace("${voiceChannel}", channel.toString())
			});
			return { userId: member.id, channelId: channel.id };
		}
	}
};

function voiceFlags(m: GuildMember) {
	const v = m.voice;
	return {
		selfMute: !!v.selfMute,
		selfDeaf: !!v.selfDeaf,
		serverMute: !!v.serverMute,
		serverDeaf: !!v.serverDeaf,
		streaming: !!v.streaming,
		video: !!v.selfVideo
	};
}

function massMove(
	members: GuildMember[],
	to: VoiceBasedChannel
): Promise<
	| (MoveReport & { total: number; done: true })
	| { done: false; started: true }
> {
	return settle(
		moveMembers(members, () => to).then((r) => ({
			...r,
			total: members.length
		}))
	);
}

// Exposed for the tests.
export { canManageNickLock };
