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

import { expect, test } from "bun:test";

import {
	WINDOW_DAYS,
	busiestWeekday,
	change,
	channelMembers,
	compact,
	formatDuration,
	leaderboard,
	localTime,
	memberTotals,
	peak,
	rankOf,
	summarize,
	timeZoneForLocale
} from "../../src/core/modules/statsAnalytics.ts";

const H = 3_600_000;
const DAY = 24 * H;
// Thursday 2026-11-05 12:00 UTC (13:00 in Paris).
const NOW = Date.UTC(2026, 10, 5, 12, 0, 0);
const UTC = { now: NOW, timeZone: "UTC" };

const msg = (ts: number, channelId = "c1", contentLength = 10) => ({
	sentTimestamp: ts,
	channelId,
	contentLength
});
const voice = (start: number, end: number, channelId = "v1") => ({
	startTimestamp: start,
	endTimestamp: end,
	channelId
});

test("local time follows the time zone", () => {
	const utc = localTime(NOW, "UTC");
	const paris = localTime(NOW, "Europe/Paris");
	expect(utc.hour).toBe(12);
	expect(paris.hour).toBe(13);
	expect(utc.weekday).toBe(3); // Thursday, Monday first
	// 23:30 UTC is already the next day in Paris.
	const late = Date.UTC(2026, 10, 5, 23, 30);
	expect(localTime(late, "Europe/Paris").day).toBe(
		localTime(late, "UTC").day + 1
	);
	expect(timeZoneForLocale("fr")).toBe("Europe/Paris");
	expect(timeZoneForLocale("xx")).toBe("UTC");
});

test("summary counts the window, weeks, heatmap and channels", () => {
	const s = summarize(
		[
			{
				messages: [
					msg(NOW - 1 * H),
					msg(NOW - 2 * H, "c2", 30),
					msg(NOW - 8 * DAY),
					msg(NOW - 40 * DAY) // outside the window
				],
				voices: [voice(NOW - 3 * H, NOW - 1 * H)]
			}
		],
		UTC
	);
	expect(s.messages).toBe(3);
	expect(s.messagesWeek).toBe(2);
	expect(s.messagesPrevWeek).toBe(1);
	expect(s.voiceMs).toBe(2 * H);
	expect(s.dailyMessages.length).toBe(WINDOW_DAYS);
	expect(s.dailyMessages.at(-1)).toBe(2);
	expect(s.dailyVoiceMinutes.at(-1)).toBe(120);
	expect(s.messageHeat[3][11]).toBe(1);
	expect(s.voiceHeat[3][9] + s.voiceHeat[3][10]).toBe(120);
	expect(s.textChannels[0]).toEqual({ id: "c1", value: 2 });
	expect(s.avgMessageLength).toBe(17);
	expect(s.longestSessionMs).toBe(2 * H);
	expect(s.sessions).toBe(1);
	const c2 = summarize(
		[{ messages: [msg(NOW - H), msg(NOW - H, "c2")] }],
		UTC,
		"c2"
	);
	expect(c2.messages).toBe(1);
});

test("streaks count consecutive active days, today optional", () => {
	const days = [1, 2, 3, 5, 6, 7, 8, 9]; // days ago
	const s = summarize(
		[{ messages: days.map((d) => msg(NOW - d * DAY)) }],
		UTC
	);
	expect(s.activeDays).toBe(8);
	expect(s.currentStreak).toBe(3); // yesterday, 2 and 3 days ago
	expect(s.longestStreak).toBe(5);
});

test("voice crossing midnight is split between the two days", () => {
	const start = Date.UTC(2026, 10, 4, 23, 0);
	const s = summarize([{ voices: [voice(start, start + 2 * H)] }], UTC);
	expect(s.dailyVoiceMinutes.at(-2)).toBe(60);
	expect(s.dailyVoiceMinutes.at(-1)).toBe(60);
});

test("peaks, change and formatting", () => {
	const heat = Array.from({ length: 7 }, () => Array(24).fill(0));
	heat[1][21] = 9;
	heat[4][10] = 3;
	expect(peak(heat)).toEqual({ weekday: 1, hour: 21, value: 9 });
	expect(busiestWeekday(heat)).toBe(1);
	expect(peak(Array.from({ length: 7 }, () => Array(24).fill(0)))).toBeNull();
	expect(change(123, 100)).toBe(23);
	expect(change(5, 0)).toBeNull();
	expect(change(0, 0)).toBe(0);
	expect(formatDuration(42 * 60_000)).toBe("42 min");
	expect(formatDuration(65 * 60_000)).toBe("1 h 05");
	expect(formatDuration(76 * H)).toBe("76 h 00");
	expect(formatDuration(140 * H)).toBe("140 h");
	expect(compact(845)).toBe("845");
	expect(compact(12_345)).toBe("12k");
	expect(compact(1_250)).toBe("1.3k");
});

test("totals, ranks, leaderboards and channel members", () => {
	const stats = {
		a: {
			messages: [msg(NOW - H), msg(NOW - 2 * H)],
			voices: [voice(NOW - 5 * H, NOW - 4 * H)]
		},
		b: { messages: [msg(NOW - 3 * DAY)] },
		c: { voices: [voice(NOW - 2 * DAY - 3 * H, NOW - 2 * DAY)] }
	};
	const totals = memberTotals(stats, NOW, "30d");
	expect(rankOf(totals, "a", "messages")).toEqual({ rank: 1, of: 2 });
	expect(rankOf(totals, "c", "messages")).toBeNull();
	expect(rankOf(totals, "c", "voiceMs")).toEqual({ rank: 1, of: 2 });
	expect(leaderboard(totals, "messages", 1).map((t) => t.id)).toEqual(["a"]);
	const day = memberTotals(stats, NOW, "1d");
	expect(day.find((t) => t.id === "b")!.messages).toBe(0);
	expect(
		channelMembers(stats, "c1", NOW)
			.map((t) => t.id)
			.sort()
	).toEqual(["a", "b"]);
});
