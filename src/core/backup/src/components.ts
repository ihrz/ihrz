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

import type { BackupData } from "./types/BackupData";

export const BACKUP_COMPONENTS = [
	"settings",
	"roles",
	"channels",
	"permissions",
	"emojis",
	"stickers",
	"bans",
	"automod",
	"events",
	"messages",
	"members"
] as const;

export type BackupComponent = (typeof BACKUP_COMPONENTS)[number];

/** Messages and members are heavy and personal: opt-in. */
export const DEFAULT_BACKUP_COMPONENTS: BackupComponent[] =
	BACKUP_COMPONENTS.filter((c) => c !== "messages" && c !== "members");

export const MAX_BACKUPS_PER_USER = 20;
export const MAX_AUTO_BACKUPS_PER_GUILD = 5;
export const MAX_MESSAGES_PER_CHANNEL = 100;

export type BackupScheduleUnit = "day" | "week" | "month";

export interface BackupFrequency {
	every: number;
	unit: BackupScheduleUnit;
}

export const BACKUP_FREQUENCIES = {
	"1d": { every: 1, unit: "day" },
	"3d": { every: 3, unit: "day" },
	"1w": { every: 1, unit: "week" },
	"2w": { every: 2, unit: "week" },
	"1m": { every: 1, unit: "month" },
	"3m": { every: 3, unit: "month" },
	"6m": { every: 6, unit: "month" },
	"12m": { every: 12, unit: "month" }
} as const satisfies Record<string, BackupFrequency>;

export type BackupFrequencyKey = keyof typeof BACKUP_FREQUENCIES;

export function frequencyKey(
	frequency: BackupFrequency
): BackupFrequencyKey | null {
	for (const [key, value] of Object.entries(BACKUP_FREQUENCIES)) {
		if (value.every === frequency.every && value.unit === frequency.unit) {
			return key as BackupFrequencyKey;
		}
	}
	return null;
}

/**
 * Keeps known components only, in canonical order. Messages live inside
 * channels, so they pull channels in.
 */
export function normalizeComponents(values: readonly string[]) {
	const wanted = new Set(values);
	if (wanted.has("messages")) wanted.add("channels");
	return BACKUP_COMPONENTS.filter((c) => wanted.has(c));
}

/** What a stored backup holds; backups made before the selector have no list. */
export function componentsOf(
	backup: Pick<
		BackupData,
		"roles" | "channels" | "emojis" | "bans" | "members"
	> & { components?: BackupComponent[] }
): BackupComponent[] {
	if (backup.components) return normalizeComponents(backup.components);

	const hasChannels =
		backup.channels.categories.length > 0 ||
		backup.channels.others.length > 0;
	const channels = [
		...backup.channels.others,
		...backup.channels.categories.flatMap((c) => c.children)
	];
	const hasMessages = channels.some(
		(c) => "messages" in c && c.messages.length > 0
	);

	const found: string[] = ["settings"];
	if (backup.roles.length) found.push("roles");
	if (hasChannels) found.push("channels", "permissions");
	if (backup.emojis.length) found.push("emojis");
	if (backup.bans.length) found.push("bans");
	if (hasMessages) found.push("messages");
	if (backup.members.length) found.push("members");
	return normalizeComponents(found);
}

/** Calendar arithmetic; Jan 31 + 1 month is the last day of February. */
export function computeNextRun(
	from: number,
	frequency: BackupFrequency
): number {
	const date = new Date(from);
	if (frequency.unit === "month") {
		const day = date.getUTCDate();
		date.setUTCDate(1);
		date.setUTCMonth(date.getUTCMonth() + frequency.every);
		const lastDay = new Date(
			Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
		).getUTCDate();
		date.setUTCDate(Math.min(day, lastDay));
		return date.getTime();
	}
	const days = frequency.unit === "week" ? 7 : 1;
	return from + frequency.every * days * 86_400_000;
}

export interface BackupIndexEntry {
	guildId?: string;
	auto?: boolean;
}

function oldestFirst(a: string, b: string): number {
	const delta = BigInt(a) - BigInt(b);
	return delta < 0n ? -1 : delta > 0n ? 1 : 0;
}

/**
 * Decides what a scheduled run does for this user and guild. A run may only
 * replace automatic backups of the same guild: a manual backup is never
 * removed to make room.
 */
export function planAutoBackup(
	index: Record<string, BackupIndexEntry>,
	guildId: string,
	maxTotal: number = MAX_BACKUPS_PER_USER,
	maxAuto: number = MAX_AUTO_BACKUPS_PER_GUILD
): { allowed: boolean; remove: string[] } {
	const autos = Object.keys(index)
		.filter((id) => index[id]?.auto && index[id]?.guildId === guildId)
		.sort(oldestFirst);
	const total = Object.keys(index).length;
	const overRetention = Math.max(0, autos.length + 1 - maxAuto);
	const overTotal = Math.max(0, total + 1 - maxTotal);
	const removeCount = Math.max(overRetention, overTotal);

	if (removeCount > autos.length) return { allowed: false, remove: [] };
	return { allowed: true, remove: autos.slice(0, removeCount) };
}

/**
 * Role names to delete so that the guild ends up with what the backup has.
 * Counted, not a set: two roles can share a name.
 */
export function surplusRoleNames(
	existing: readonly string[],
	wanted: readonly string[]
): string[] {
	const remaining = new Map<string, number>();
	for (const name of wanted) {
		remaining.set(name, (remaining.get(name) ?? 0) + 1);
	}
	return existing.filter((name) => {
		const left = remaining.get(name) ?? 0;
		if (left === 0) return true;
		remaining.set(name, left - 1);
		return false;
	});
}

/**
 * New positions that put `desired` (highest first) in order, reusing only the
 * slots those roles already hold: every other role stays exactly where it is.
 */
export function reorderedPositions(
	current: readonly { id: string; position: number }[],
	desired: readonly string[]
): { role: string; position: number }[] {
	const position = new Map(current.map((r) => [r.id, r.position]));
	const slots = desired
		.flatMap((id) => {
			const slot = position.get(id);
			return slot === undefined ? [] : [slot];
		})
		.sort((a, b) => b - a);
	const known = desired.filter((id) => position.has(id));
	return known.flatMap((role, index) =>
		position.get(role) === slots[index]
			? []
			: [{ role, position: slots[index] }]
	);
}

export interface BackupScheduleRecord {
	ownerId: string;
	every: number;
	unit: BackupScheduleUnit;
	components: string[];
	nextRunAt: number;
	lastRunAt?: number | null;
	lastError?: "limit" | "failed" | null;
}

/** What /backup schedule saves: the next run counts from now. */
export function buildSchedule(
	ownerId: string,
	frequency: BackupFrequency,
	components: readonly string[],
	previous: Pick<BackupScheduleRecord, "lastRunAt"> | null,
	now: number = Date.now()
): BackupScheduleRecord {
	return {
		ownerId,
		every: frequency.every,
		unit: frequency.unit,
		components: normalizeComponents(components),
		nextRunAt: computeNextRun(now, frequency),
		lastRunAt: previous?.lastRunAt ?? null,
		lastError: null
	};
}
