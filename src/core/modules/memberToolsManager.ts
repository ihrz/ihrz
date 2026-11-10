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

// Shared logic of the member data commands (invites, economy, ranks, lockname,
// leash) and of the voice moderation commands (move, massmove, bringall,
// vkick). The slash commands and the dashboard actions
// (`gatewayLinkActions/members.ts`) both call these, so the database format
// and the guards stay the same on both sides.

import {
	ChannelType,
	Client,
	Guild,
	GuildBasedChannel,
	GuildMember,
	PermissionFlagsBits,
	VoiceBasedChannel
} from "discord.js";
import { DatabaseStructure } from "../../../types/database_structure.js";

// ── Invites (`/inv addinvites`, `/inv removeinvites`, `/inv reset`) ─────────

// Adds or removes `amount` invites (and bonus) of a member; returns the new
// invites total.
export async function editMemberInvites(
	client: Client,
	guildId: string,
	userId: string,
	op: "add" | "remove",
	amount: number
): Promise<number> {
	const base = `${guildId}.USER.${userId}.INVITES`;
	if (!(await client.db.get(base))) {
		await client.db.set(base, {
			regular: 0,
			bonus: 0,
			leaves: 0,
			invites: 0
		});
	}
	if (op === "add") {
		await client.db.add(`${base}.invites`, amount);
		await client.db.add(`${base}.bonus`, amount);
	} else {
		await client.db.sub(`${base}.invites`, amount);
		await client.db.sub(`${base}.bonus`, amount);
	}
	return (await client.db.get(`${base}.invites`)) || 0;
}

// Empties the invites of every member of the guild; returns how many members.
export async function resetGuildInvites(
	client: Client,
	guildId: string
): Promise<number> {
	const baseData = ((await client.db.get(`${guildId}.USER`)) ||
		{}) as DatabaseStructure.DbGuildUserObject;
	let count = 0;
	for (const user in baseData) {
		baseData[user].INVITES = {};
		count++;
	}
	await client.db.set(`${guildId}.USER`, baseData);
	return count;
}

// ── Economy (`/economy balance-add|balance-remove|ureset|greset`) ───────────

export async function isEconomyDisabled(
	client: Client,
	guildId: string
): Promise<boolean> {
	return (await client.db.get(`${guildId}.ECONOMY.disabled`)) === true;
}

// Adds or removes money from a member's wallet; returns the new balance.
export async function editMemberMoney(
	client: Client,
	guildId: string,
	userId: string,
	op: "add" | "remove",
	amount: number
): Promise<number> {
	const key = `${guildId}.USER.${userId}.ECONOMY.money`;
	if (op === "add") await client.db.add(key, amount);
	else await client.db.sub(key, amount);
	return (await client.db.get(key)) || 0;
}

export type MemberDataSection = "ECONOMY" | "XP_LEVELING";

// `/economy ureset`, `/ranks ureset`.
export async function resetMemberSection(
	client: Client,
	guildId: string,
	userId: string,
	section: MemberDataSection
): Promise<void> {
	await client.db.delete(`${guildId}.USER.${userId}.${section}`);
}

// `/economy greset`, `/ranks greset`; returns how many members.
export async function resetGuildSection(
	client: Client,
	guildId: string,
	section: MemberDataSection
): Promise<number> {
	const data = ((await client.db.get(`${guildId}.USER`)) || {}) as Record<
		string,
		unknown
	>;
	let count = 0;
	for (const userId in data) {
		await client.db.delete(`${guildId}.USER.${userId}.${section}`);
		count++;
	}
	return count;
}

// ── Lockname (`/utilss lockname|unlockname|locknamelist`) ──────────────────

// The author can't lock someone above them, nor the owner (but the owner can).
export function canManageNickLock(
	guild: Guild,
	author: GuildMember,
	target: GuildMember
): boolean {
	if (guild.ownerId === author.id) return true;
	return (
		target.id !== guild.ownerId &&
		target.roles.highest.position < author.roles.highest.position
	);
}

export type LockNameResult =
	| { ok: true; nick: string | null }
	| { ok: false; reason: "hierarchy" | "not_manageable" | "already_locked" };

export async function lockMemberName(
	client: Client,
	guild: Guild,
	author: GuildMember,
	target: GuildMember,
	desiredNickname: string | null
): Promise<LockNameResult> {
	if (!canManageNickLock(guild, author, target)) {
		return { ok: false, reason: "hierarchy" };
	}
	if (!target.manageable) return { ok: false, reason: "not_manageable" };
	if (await client.db.get(`${guild.id}.LOCKNAME.${target.id}`)) {
		return { ok: false, reason: "already_locked" };
	}

	const lockedNick = desiredNickname
		? desiredNickname.trim().substring(0, 32)
		: (target.nickname ?? null);

	if (lockedNick && lockedNick !== target.nickname) {
		try {
			await target.edit({ nick: lockedNick });
		} catch {
			return { ok: false, reason: "not_manageable" };
		}
	}

	await client.db.set(`${guild.id}.LOCKNAME.${target.id}`, {
		nick: lockedNick,
		lockedBy: author.id,
		lockedAt: Date.now()
	} satisfies DatabaseStructure.LockNameData);
	return { ok: true, nick: lockedNick };
}

export type UnlockNameResult =
	{ ok: true } | { ok: false; reason: "hierarchy" | "not_locked" };

export async function unlockMemberName(
	client: Client,
	guild: Guild,
	author: GuildMember,
	target: GuildMember
): Promise<UnlockNameResult> {
	if (!canManageNickLock(guild, author, target)) {
		return { ok: false, reason: "hierarchy" };
	}
	if (!(await client.db.get(`${guild.id}.LOCKNAME.${target.id}`))) {
		return { ok: false, reason: "not_locked" };
	}
	await client.db.delete(`${guild.id}.LOCKNAME.${target.id}`);

	// Clear the custom nickname: back to the user's global display name.
	if (target.manageable && target.nickname) {
		await target.edit({ nick: null }).catch(() => {});
	}
	return { ok: true };
}

// Locked names, most recent first.
export function sortLockNames(
	list: Record<string, DatabaseStructure.LockNameData | undefined> | null
): [string, DatabaseStructure.LockNameData][] {
	const entries = Object.entries(list || {}).filter(
		(e): e is [string, DatabaseStructure.LockNameData] =>
			e[1] !== undefined && e[1] !== null
	);
	entries.sort(([, a], [, b]) => (b.lockedAt ?? 0) - (a.lockedAt ?? 0));
	return entries;
}

export async function listLockNames(
	client: Client,
	guildId: string
): Promise<[string, DatabaseStructure.LockNameData][]> {
	return sortLockNames(
		await client.db.get<
			Record<string, DatabaseStructure.LockNameData | undefined>
		>(`${guildId}.LOCKNAME`)
	);
}

// ── Leash (`/utils leash|unleash`, `/utilss leashlist`) ─────────────────────

export async function getLeashConfig(
	client: Client,
	guildId: string
): Promise<Required<DatabaseStructure.LeashConfig>> {
	const cfg = ((await client.db.get(`${guildId}.UTILS.LEASH_CONFIG`)) ||
		{}) as DatabaseStructure.LeashConfig;
	return {
		maxLeashedByUsers: cfg.maxLeashedByUsers ?? 3,
		maxLeashTime: cfg.maxLeashTime ?? client.timeCalculator.to_ms("30min")
	};
}

export async function getLeashes(
	client: Client,
	guildId: string
): Promise<DatabaseStructure.LeashData[]> {
	return ((await client.db.get(`${guildId}.UTILS.LEASH`)) ||
		[]) as DatabaseStructure.LeashData[];
}

export function activeLeashes(
	leashes: DatabaseStructure.LeashData[],
	maxLeashTime: number,
	now = Date.now()
): DatabaseStructure.LeashData[] {
	return leashes.filter((leash) => now - leash.timestamp <= maxLeashTime);
}

// `/utils unleash`: only the one who holds the leash can release it.
export async function releaseLeash(
	client: Client,
	guildId: string,
	domId: string,
	subId: string
): Promise<boolean> {
	const leashes = await getLeashes(client, guildId);
	if (!leashes.find((x) => x.dom === domId && x.sub === subId)) return false;
	await client.db.set(
		`${guildId}.UTILS.LEASH`,
		Array.from(
			new Set(
				leashes.filter((x) => !(x.dom === domId && x.sub === subId))
			)
		)
	);
	return true;
}

// ── Voice (`/util move|vkick|bringall`, `/utils massmove`) ──────────────────

// `/util move`: only an administrator can move an administrator.
export function canMoveMember(
	author: GuildMember,
	target: GuildMember
): boolean {
	return (
		!target.permissions.has(PermissionFlagsBits.Administrator) ||
		author.permissions.has(PermissionFlagsBits.Administrator)
	);
}

// `/util vkick`: administrators can't be kicked from voice.
export function canVoiceKick(target: GuildMember): boolean {
	return !target.permissions.has(PermissionFlagsBits.Administrator);
}

export type MoveReport = { moved: number; failed: number };

// Moves each member, one after the other (Discord rate-limits moves).
export async function moveMembers(
	members: Iterable<GuildMember>,
	pickChannel: (index: number) => VoiceBasedChannel | null
): Promise<MoveReport> {
	let moved = 0;
	let failed = 0;
	let i = 0;
	for (const member of members) {
		try {
			await member.voice.setChannel(pickChannel(i++));
			moved++;
		} catch {
			failed++;
		}
	}
	return { moved, failed };
}

// `/utils massmove` without `from`: the voice channels it empties.
export function massMoveSourceChannels(guild: Guild): GuildBasedChannel[] {
	return Array.from(guild.channels.cache.values()).filter(
		(x) => x.type === ChannelType.GuildVoice
	);
}

// Members of the given voice channels, in order.
export function membersOfChannels(
	channels: readonly { isVoiceBased(): boolean }[]
): GuildMember[] {
	const out: GuildMember[] = [];
	for (const channel of channels) {
		if (!channel.isVoiceBased()) continue;
		for (const member of (
			channel as unknown as VoiceBasedChannel
		).members.values()) {
			out.push(member);
		}
	}
	return out;
}

// `/util bringall`: voice channels of a category the members are spread to.
export function categoryVoiceChannels(
	category: GuildBasedChannel
): VoiceBasedChannel[] {
	if (category.type !== ChannelType.GuildCategory) return [];
	return Array.from(category.children.cache.values()).filter(
		(channel) =>
			channel.type === ChannelType.GuildVoice ||
			channel.type === ChannelType.GuildStageVoice
	) as VoiceBasedChannel[];
}
