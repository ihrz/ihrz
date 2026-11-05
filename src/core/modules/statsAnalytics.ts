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

// What /stats shows, computed from the stored activity (30 days of
// messages and voice sessions per member). Pure: no Discord, no database,
// so every number is testable. Days and hours are counted in a time zone
// (the server's, from its language) so "Tuesday 21:00" means something.

import type { DatabaseStructure } from "../../../types/database_structure.js";

type Message = DatabaseStructure.StatsMessage;
type Voice = DatabaseStructure.StatsVoice;
type UserStats = DatabaseStructure.UserStats;

export const WINDOW_DAYS = 30;
const DAY = 86_400_000;
const MINUTE = 60_000;

/** Weekday rows Monday first; 24 hour columns. */
export type Heatmap = number[][];

export interface Clock {
	now: number;
	timeZone: string;
}

/** A guess of the server's time zone from its language. */
export function timeZoneForLocale(locale: string | null | undefined): string {
	const zones: Record<string, string> = {
		fr: "Europe/Paris",
		de: "Europe/Berlin",
		"es-ES": "Europe/Madrid",
		"es-419": "America/Mexico_City",
		it: "Europe/Rome",
		"pt-BR": "America/Sao_Paulo",
		ru: "Europe/Moscow",
		uk: "Europe/Kyiv",
		pl: "Europe/Warsaw",
		nl: "Europe/Amsterdam",
		ja: "Asia/Tokyo",
		ko: "Asia/Seoul",
		"zh-CN": "Asia/Shanghai",
		tr: "Europe/Istanbul",
		"en-GB": "Europe/London",
		"en-US": "America/New_York"
	};
	return (locale && zones[locale]) || "UTC";
}

const partsCache = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string): Intl.DateTimeFormat {
	let f = partsCache.get(timeZone);
	if (!f) {
		f = new Intl.DateTimeFormat("en-US", {
			timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			hourCycle: "h23",
			weekday: "short"
		});
		partsCache.set(timeZone, f);
	}
	return f;
}

const WEEKDAYS: Record<string, number> = {
	Mon: 0,
	Tue: 1,
	Wed: 2,
	Thu: 3,
	Fri: 4,
	Sat: 5,
	Sun: 6
};

type LocalTime = { day: number; weekday: number; hour: number };

// Every UTC offset is a multiple of 15 minutes, so the local day and hour
// are the same for a whole quarter hour: cache by quarter (Intl formatting
// is slow and a server can have hundreds of thousands of messages).
const QUARTER = 15 * MINUTE;
const localCache = new Map<string, Map<number, LocalTime>>();
const LOCAL_CACHE_MAX = 20_000;

/** Local calendar day (as a number), weekday (Monday = 0) and hour. */
export function localTime(ts: number, timeZone: string): LocalTime {
	const quarter = Math.floor(ts / QUARTER);
	let zone = localCache.get(timeZone);
	if (!zone) {
		zone = new Map();
		localCache.set(timeZone, zone);
	}
	const hit = zone.get(quarter);
	if (hit) return hit;
	const parts = Object.fromEntries(
		formatter(timeZone)
			.formatToParts(quarter * QUARTER)
			.map((p) => [p.type, p.value])
	);
	const value = {
		day: Date.UTC(+parts.year, +parts.month - 1, +parts.day) / DAY,
		weekday: WEEKDAYS[parts.weekday] ?? 0,
		hour: +parts.hour % 24
	};
	if (zone.size >= LOCAL_CACHE_MAX) zone.clear();
	zone.set(quarter, value);
	return value;
}

function emptyHeatmap(): Heatmap {
	return Array.from({ length: 7 }, () => Array(24).fill(0));
}

/** Voice time is spread over the hours it covers, minute by minute buckets. */
function spreadVoice(
	v: Voice,
	clock: Clock,
	onPiece: (ts: number, ms: number) => void
): void {
	const start = Math.max(v.startTimestamp, clock.now - WINDOW_DAYS * DAY);
	const end = Math.min(v.endTimestamp, clock.now);
	let t = start;
	while (t < end) {
		// Pieces end on the next quarter hour: hours and days split correctly
		// in every time zone (some are offset by 30 or 45 minutes).
		const next = Math.min(
			end,
			(Math.floor(t / (15 * MINUTE)) + 1) * 15 * MINUTE
		);
		onPiece(t, next - t);
		t = next;
	}
}

export interface ActivitySummary {
	messages: number;
	voiceMs: number;
	/** Per local day, oldest first (WINDOW_DAYS entries, today last). */
	dailyMessages: number[];
	dailyVoiceMinutes: number[];
	/** Labels for those days: the local day numbers. */
	days: number[];
	messageHeat: Heatmap;
	voiceHeat: Heatmap;
	activeDays: number;
	currentStreak: number;
	longestStreak: number;
	/** Last 7 days against the 7 before. */
	messagesWeek: number;
	messagesPrevWeek: number;
	voiceWeekMs: number;
	voicePrevWeekMs: number;
	avgMessageLength: number;
	longestSessionMs: number;
	avgSessionMs: number;
	sessions: number;
	textChannels: { id: string; value: number }[];
	voiceChannels: { id: string; value: number }[];
}

/** Activity of one member, several members, or one channel. */
export function summarize(
	users: UserStats[],
	clock: Clock,
	channelId?: string
): ActivitySummary {
	const today = localTime(clock.now, clock.timeZone).day;
	const firstDay = today - (WINDOW_DAYS - 1);
	const days = Array.from({ length: WINDOW_DAYS }, (_, i) => firstDay + i);
	const dailyMessages = Array(WINDOW_DAYS).fill(0);
	const dailyVoice = Array(WINDOW_DAYS).fill(0);
	const messageHeat = emptyHeatmap();
	const voiceHeat = emptyHeatmap();
	const text = new Map<string, number>();
	const voice = new Map<string, number>();
	const since = clock.now - WINDOW_DAYS * DAY;
	const weekAgo = clock.now - 7 * DAY;
	const twoWeeksAgo = clock.now - 14 * DAY;

	let messages = 0;
	let length = 0;
	let voiceMs = 0;
	let messagesWeek = 0;
	let messagesPrevWeek = 0;
	let voiceWeekMs = 0;
	let voicePrevWeekMs = 0;
	let longestSessionMs = 0;
	let sessionTotal = 0;
	let sessions = 0;

	for (const u of users) {
		for (const m of u.messages ?? []) {
			if (m.sentTimestamp < since || m.sentTimestamp > clock.now)
				continue;
			if (channelId && m.channelId !== channelId) continue;
			messages++;
			length += m.contentLength || 0;
			const t = localTime(m.sentTimestamp, clock.timeZone);
			const i = t.day - firstDay;
			if (i >= 0 && i < WINDOW_DAYS) dailyMessages[i]++;
			messageHeat[t.weekday][t.hour]++;
			text.set(m.channelId, (text.get(m.channelId) ?? 0) + 1);
			if (m.sentTimestamp >= weekAgo) messagesWeek++;
			else if (m.sentTimestamp >= twoWeeksAgo) messagesPrevWeek++;
		}
		for (const v of u.voices ?? []) {
			if (v.endTimestamp < since || v.startTimestamp > clock.now)
				continue;
			if (v.endTimestamp <= v.startTimestamp) continue;
			if (channelId && v.channelId !== channelId) continue;
			let counted = 0;
			spreadVoice(v, clock, (ts, ms) => {
				const t = localTime(ts, clock.timeZone);
				const i = t.day - firstDay;
				if (i >= 0 && i < WINDOW_DAYS) dailyVoice[i] += ms / MINUTE;
				voiceHeat[t.weekday][t.hour] += ms / MINUTE;
				if (ts >= weekAgo) voiceWeekMs += ms;
				else if (ts >= twoWeeksAgo) voicePrevWeekMs += ms;
				counted += ms;
			});
			voiceMs += counted;
			voice.set(v.channelId, (voice.get(v.channelId) ?? 0) + counted);
			const whole = v.endTimestamp - v.startTimestamp;
			longestSessionMs = Math.max(longestSessionMs, whole);
			sessionTotal += whole;
			sessions++;
		}
	}

	const active = days.map(
		(_, i) => dailyMessages[i] > 0 || dailyVoice[i] >= 1
	);
	let longestStreak = 0;
	let run = 0;
	for (const a of active) {
		run = a ? run + 1 : 0;
		longestStreak = Math.max(longestStreak, run);
	}
	// Today may still be quiet: a streak that ended yesterday still counts.
	let currentStreak = 0;
	let end = WINDOW_DAYS - 1;
	if (!active[end]) end--;
	for (let i = end; i >= 0 && active[i]; i--) currentStreak++;

	const ranked = (map: Map<string, number>) =>
		[...map.entries()]
			.map(([id, value]) => ({ id, value }))
			.sort((a, b) => b.value - a.value);

	return {
		messages,
		voiceMs,
		dailyMessages,
		dailyVoiceMinutes: dailyVoice.map((v) => Math.round(v)),
		days,
		messageHeat,
		voiceHeat: voiceHeat.map((row) => row.map((v) => Math.round(v))),
		activeDays: active.filter(Boolean).length,
		currentStreak,
		longestStreak,
		messagesWeek,
		messagesPrevWeek,
		voiceWeekMs,
		voicePrevWeekMs,
		avgMessageLength: messages ? Math.round(length / messages) : 0,
		longestSessionMs,
		avgSessionMs: sessions ? Math.round(sessionTotal / sessions) : 0,
		sessions,
		textChannels: ranked(text),
		voiceChannels: ranked(voice)
	};
}

/** Busiest weekday and hour of a heatmap; null when it is empty. */
export function peak(
	heat: Heatmap
): { weekday: number; hour: number; value: number } | null {
	let best: { weekday: number; hour: number; value: number } | null = null;
	heat.forEach((row, weekday) =>
		row.forEach((value, hour) => {
			if (value > 0 && (!best || value > best.value))
				best = { weekday, hour, value };
		})
	);
	return best;
}

/** Busiest weekday overall (sum of its row). */
export function busiestWeekday(heat: Heatmap): number | null {
	const sums = heat.map((row) => row.reduce((a, b) => a + b, 0));
	const max = Math.max(...sums);
	return max > 0 ? sums.indexOf(max) : null;
}

/** Percentage change, rounded; null when there is nothing to compare to. */
export function change(current: number, previous: number): number | null {
	if (previous <= 0) return current > 0 ? null : 0;
	return Math.round(((current - previous) / previous) * 100);
}

export type Period = "1d" | "7d" | "30d";

export function periodMs(period: Period): number {
	return period === "1d"
		? DAY
		: period === "7d"
			? 7 * DAY
			: WINDOW_DAYS * DAY;
}

export interface MemberTotals {
	id: string;
	messages: number;
	voiceMs: number;
}

/** Messages and voice time of every member over a period. */
export function memberTotals(
	stats: Record<string, UserStats>,
	now: number,
	period: Period = "30d"
): MemberTotals[] {
	const since = now - periodMs(period);
	return Object.entries(stats).map(([id, u]) => {
		const messages = (u.messages ?? []).filter(
			(m) => m.sentTimestamp >= since && m.sentTimestamp <= now
		).length;
		const voiceMs = (u.voices ?? []).reduce((acc, v) => {
			const start = Math.max(v.startTimestamp, since);
			const end = Math.min(v.endTimestamp, now);
			return end > start ? acc + (end - start) : acc;
		}, 0);
		return { id, messages, voiceMs };
	});
}

/** 1-based rank of a member for a metric; null when they have none. */
export function rankOf(
	totals: MemberTotals[],
	id: string,
	metric: "messages" | "voiceMs"
): { rank: number; of: number } | null {
	const ranked = totals
		.filter((t) => t[metric] > 0)
		.sort((a, b) => b[metric] - a[metric]);
	const i = ranked.findIndex((t) => t.id === id);
	return i < 0 ? null : { rank: i + 1, of: ranked.length };
}

export function leaderboard(
	totals: MemberTotals[],
	metric: "messages" | "voiceMs",
	limit: number
): MemberTotals[] {
	return totals
		.filter((t) => t[metric] > 0)
		.sort((a, b) => b[metric] - a[metric])
		.slice(0, limit);
}

/** Members of a channel by messages (or voice time) in it. */
export function channelMembers(
	stats: Record<string, UserStats>,
	channelId: string,
	now: number
): MemberTotals[] {
	const since = now - WINDOW_DAYS * DAY;
	return Object.entries(stats)
		.map(([id, u]) => ({
			id,
			messages: (u.messages ?? []).filter(
				(m) => m.channelId === channelId && m.sentTimestamp >= since
			).length,
			voiceMs: (u.voices ?? [])
				.filter(
					(v) => v.channelId === channelId && v.endTimestamp >= since
				)
				.reduce(
					(acc, v) =>
						acc +
						Math.max(
							0,
							Math.min(v.endTimestamp, now) -
								Math.max(v.startTimestamp, since)
						),
					0
				)
		}))
		.filter((t) => t.messages > 0 || t.voiceMs > 0);
}

/** `42 min`, `1 h 05`, `25 h 12`, `140 h`: hours read better than days. */
export function formatDuration(ms: number): string {
	const minutes = Math.round(ms / MINUTE);
	if (minutes < 60) return `${minutes} min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 100)
		return `${hours} h ${String(minutes % 60).padStart(2, "0")}`;
	return `${hours} h`;
}

/** `12.3k`, `1.2M`, `845`. */
export function compact(n: number): string {
	if (n < 1000) return String(Math.round(n));
	if (n < 1_000_000)
		return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}k`;
	return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}
