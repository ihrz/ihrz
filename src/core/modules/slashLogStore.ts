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

// Slash command logs in the database, table `slash_logs` (schema and key
// layout: DatabaseStructure.SlashLogEntry in types/database_structure.d.ts).
// Read by HorizonGateway for the owner-only explorer of the dashboard.
//
// Every shard writes its own rows only (keys end with `_s{shard}`), so no
// two processes ever write the same key, whatever the database driver:
// - entries: pushed in batches into the row of their UTC hour;
// - day counters: kept in memory, written every minute;
// - `shards`: the shard ids that wrote logs, so readers know which rows exist.
// Rows older than SLASH_LOG_RETENTION_DAYS are deleted by their own shard.

import { DatabaseStructure } from "../../../types/database_structure.js";

export const SLASH_LOG_TABLE = "slash_logs";
export const SLASH_LOG_RETENTION_DAYS = 90;

const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;
const ENTRY_FLUSH_DELAY_MS = 2_000;
const ENTRY_FLUSH_BATCH = 50;
const STATS_FLUSH_INTERVAL_MS = 60_000;
// Hours behind the retention limit swept at boot: rows of hours missed while
// the bot was offline are caught up.
const BOOT_PURGE_HOURS = 7 * 24;

export type SlashLogEntry = DatabaseStructure.SlashLogEntry;
export type SlashLogDayStats = DatabaseStructure.SlashLogDayStats;

export interface SlashLogTable {
	get<T = unknown>(key: string): Promise<T | null>;
	set<T = unknown>(key: string, value: T): Promise<unknown>;
	push<T = unknown>(key: string, ...values: T[]): Promise<unknown>;
	delete(key: string): Promise<unknown>;
}

const pad = (n: number, size = 2) => String(n).padStart(size, "0");

function utcDay(ms: number): string {
	const d = new Date(ms);
	return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

export function slashLogHourKey(ms: number, shard: string): string {
	return `h${utcDay(ms)}${pad(new Date(ms).getUTCHours())}_s${shard}`;
}

export function slashLogDayKey(ms: number, shard: string): string {
	return `d${utcDay(ms)}_s${shard}`;
}

export function emptyDayStats(): SlashLogDayStats {
	return {
		total: 0,
		hours: new Array(24).fill(0),
		commands: {},
		guilds: {},
		users: {},
		guildNames: {},
		userNames: {}
	};
}

// A stored day document may be partial or damaged: never trust its shape.
export function normalizeDayStats(value: unknown): SlashLogDayStats {
	const stats = emptyDayStats();
	if (!value || typeof value !== "object") return stats;

	const source = value as Partial<SlashLogDayStats>;
	const counts = (record: unknown) =>
		Object.fromEntries(
			Object.entries((record as Record<string, unknown>) || {}).filter(
				([, n]) => typeof n === "number" && Number.isFinite(n)
			)
		) as Record<string, number>;
	const names = (record: unknown) =>
		Object.fromEntries(
			Object.entries((record as Record<string, unknown>) || {}).filter(
				([, n]) => typeof n === "string"
			)
		) as Record<string, string>;

	stats.total = typeof source.total === "number" ? source.total : 0;
	if (Array.isArray(source.hours)) {
		for (let i = 0; i < 24; i++) {
			const n = source.hours[i];
			stats.hours[i] = typeof n === "number" ? n : 0;
		}
	}
	stats.commands = counts(source.commands);
	stats.guilds = counts(source.guilds);
	stats.users = counts(source.users);
	stats.guildNames = names(source.guildNames);
	stats.userNames = names(source.userNames);
	return stats;
}

export function addToDayStats(
	stats: SlashLogDayStats,
	entry: SlashLogEntry
): void {
	stats.total++;
	stats.hours[new Date(entry.at).getUTCHours()]++;
	stats.commands[entry.command] = (stats.commands[entry.command] ?? 0) + 1;
	stats.guilds[entry.guildId] = (stats.guilds[entry.guildId] ?? 0) + 1;
	stats.users[entry.userId] = (stats.users[entry.userId] ?? 0) + 1;
	stats.guildNames[entry.guildId] = entry.guildName;
	stats.userNames[entry.userId] = entry.username;
}

// Keys a shard deletes: the hours that ended before the retention limit,
// over `hours` hours behind it, and the days that ended before it.
export function expiredKeys(
	now: number,
	shard: string,
	hours: number
): string[] {
	const limit = now - SLASH_LOG_RETENTION_DAYS * DAY_MS;
	const lastHour = Math.floor(limit / HOUR_MS) - 1;
	const keys: string[] = [];

	for (let hour = lastHour; hour > lastHour - hours; hour--) {
		keys.push(slashLogHourKey(hour * HOUR_MS, shard));
	}

	const lastDay = Math.floor(limit / DAY_MS) - 1;
	const firstDay = Math.floor(((lastHour - hours + 1) * HOUR_MS) / DAY_MS);
	for (let day = lastDay; day >= firstDay; day--) {
		keys.push(slashLogDayKey(day * DAY_MS, shard));
	}

	return keys;
}

export class SlashLogStore {
	private pending: SlashLogEntry[] = [];
	private flushTimer: ReturnType<typeof setTimeout> | null = null;
	private flushing: Promise<void> | null = null;
	private days = new Map<string, SlashLogDayStats>();
	private dirtyDays = new Set<string>();
	private loadingDays = new Map<string, Promise<void>>();
	private statsTimer: ReturnType<typeof setInterval> | null = null;
	private purgeTimer: ReturnType<typeof setInterval> | null = null;
	private shardMarked = false;

	constructor(
		private readonly table: () => Promise<SlashLogTable>,
		private readonly shard: string,
		private readonly now: () => number = Date.now
	) {}

	// Timers: day counters every minute, purge every hour (plus a catch-up
	// sweep at boot). Not started by tests.
	start(): void {
		this.statsTimer ??= setInterval(
			() => void this.flushStats(),
			STATS_FLUSH_INTERVAL_MS
		);
		this.purgeTimer ??= setInterval(() => void this.purge(1), HOUR_MS);
		void this.purge(BOOT_PURGE_HOURS);
	}

	stop(): void {
		if (this.statsTimer) clearInterval(this.statsTimer);
		if (this.purgeTimer) clearInterval(this.purgeTimer);
		this.statsTimer = this.purgeTimer = null;
	}

	add(entry: SlashLogEntry): void {
		this.pending.push(entry);
		void this.countInDay(entry);

		if (this.pending.length >= ENTRY_FLUSH_BATCH) {
			void this.flushEntries();
		} else {
			this.flushTimer ??= setTimeout(
				() => void this.flushEntries(),
				ENTRY_FLUSH_DELAY_MS
			);
		}
	}

	// The day document is read once (an earlier run of this shard may have
	// written it today), then counted in memory.
	private async countInDay(entry: SlashLogEntry): Promise<void> {
		const key = slashLogDayKey(entry.at, this.shard);

		if (!this.days.has(key)) {
			let loading = this.loadingDays.get(key);
			if (!loading) {
				loading = (async () => {
					const table = await this.table();
					const stored = await table.get(key).catch(() => null);
					if (!this.days.has(key)) {
						this.days.set(key, normalizeDayStats(stored));
					}
				})();
				this.loadingDays.set(key, loading);
			}
			await loading;
			this.loadingDays.delete(key);
		}

		addToDayStats(this.days.get(key)!, entry);
		this.dirtyDays.add(key);
	}

	async flushEntries(): Promise<void> {
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
			this.flushTimer = null;
		}
		// One flush at a time: a second call waits, then writes what is left.
		while (this.flushing) await this.flushing;
		if (this.pending.length === 0) return;

		const batch = this.pending;
		this.pending = [];

		this.flushing = (async () => {
			const byHour = new Map<string, SlashLogEntry[]>();
			for (const entry of batch) {
				const key = slashLogHourKey(entry.at, this.shard);
				byHour.set(key, [...(byHour.get(key) ?? []), entry]);
			}

			const table = await this.table();
			for (const [key, entries] of byHour) {
				try {
					await table.push(key, ...entries);
				} catch (error) {
					// Kept for the next flush instead of being lost.
					this.pending.unshift(...entries);
					logger.err(
						`Unable to save ${entries.length} command logs:`,
						error
					);
				}
			}

			if (!this.shardMarked) {
				await table
					.set(`shards.${this.shard}`, this.now())
					.then(() => {
						this.shardMarked = true;
					})
					.catch(() => {});
			}
		})();

		try {
			await this.flushing;
		} finally {
			this.flushing = null;
		}
	}

	async flushStats(): Promise<void> {
		if (this.dirtyDays.size === 0) return;
		const table = await this.table();
		const today = slashLogDayKey(this.now(), this.shard);

		for (const key of [...this.dirtyDays]) {
			this.dirtyDays.delete(key);
			try {
				await table.set(key, this.days.get(key));
			} catch (error) {
				this.dirtyDays.add(key);
				logger.err(`Unable to save the command stats ${key}:`, error);
			}
			// Past days are final: no need to keep them in memory.
			if (key !== today && !this.dirtyDays.has(key))
				this.days.delete(key);
		}
	}

	async purge(hours: number): Promise<void> {
		try {
			const table = await this.table();
			for (const key of expiredKeys(this.now(), this.shard, hours)) {
				await table.delete(key).catch(() => {});
			}
		} catch (error) {
			logger.err("Unable to purge old command logs:", error);
		}
	}

	async forceFlush(): Promise<void> {
		await this.flushEntries();
		await this.flushStats();
	}
}
