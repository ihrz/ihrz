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

// What every /stats subcommand shares: loading the stored activity, the
// views (each one an image plus a few sentences), and the Components V2
// card with a menu to switch views in place.

import {
	ActionRowBuilder,
	AttachmentBuilder,
	ChatInputCommandInteraction,
	Client,
	ContainerBuilder,
	Guild,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	Message,
	MessageFlags,
	SeparatorBuilder,
	SeparatorSpacingSize,
	StringSelectMenuBuilder,
	TextDisplayBuilder,
	escapeMarkdown
} from "discord.js";

import { DatabaseStructure } from "../../../types/database_structure.js";
import { LanguageData } from "../../../types/languageData.js";
import {
	ActivitySummary,
	Clock,
	MemberTotals,
	Period,
	busiestWeekday,
	change,
	channelMembers,
	compact,
	formatDuration,
	leaderboard,
	memberTotals,
	peak,
	rankOf,
	summarize,
	timeZoneForLocale
} from "./statsAnalytics.js";
import {
	BarRow,
	Figure,
	PALETTE,
	renderCompare,
	renderOverview,
	renderRanking,
	renderRhythm,
	weekdayNames
} from "./statsCanvas.js";
import { fetchAvatar } from "./statsPage.js";
import { botSignature } from "./uiCard.js";

type Source = ChatInputCommandInteraction<"cached"> | Message;
type Stats = Record<string, DatabaseStructure.UserStats>;

export interface StatsView {
	id: string;
	label: string;
	description: string;
	/** The image and the sentences under the title. */
	build: () => Promise<{ image: Buffer; insights: string[] }>;
}

export interface StatsContext {
	client: Client;
	interaction: Source;
	lang: LanguageData;
	guild: Guild;
	clock: Clock;
	stats: Stats;
	locale: string;
	signature: string;
}

const COLLECTOR_MS = 5 * 60_000;
const SELECT_ID = "stats_view";

export async function statsContext(
	client: Client,
	interaction: Source,
	lang: LanguageData
): Promise<StatsContext> {
	const guild = interaction.guild!;
	const stats =
		((await client.db.get(`${guild.id}.STATS.USER`)) as Stats | null) ?? {};
	return {
		client,
		interaction,
		lang,
		guild,
		stats,
		clock: {
			now: Date.now(),
			timeZone: timeZoneForLocale(guild.preferredLocale)
		},
		locale: lang.stats_locale,
		signature: await botSignature(client, guild.id)
	};
}

/* ------------------------------------------------------------------ */
/* Small formatting helpers                                            */
/* ------------------------------------------------------------------ */

function hourLabel(locale: string, hour: number): string {
	return new Intl.DateTimeFormat(locale, {
		hour: "numeric",
		timeZone: "UTC"
	}).format(new Date(Date.UTC(2024, 0, 1, hour)));
}

function changeNote(
	lang: LanguageData,
	current: number,
	previous: number
): Pick<Figure, "note" | "tone"> {
	const c = change(current, previous);
	if (c === null) return { note: lang.stats_note_new, tone: "up" };
	if (c === 0) return { note: lang.stats_note_steady, tone: "muted" };
	return c > 0
		? {
				note: lang.stats_note_change_up.replace("${change}", String(c)),
				tone: "up"
			}
		: {
				note: lang.stats_note_change_down.replace(
					"${change}",
					String(-c)
				),
				tone: "down"
			};
}

function memberName(ctx: StatsContext, id: string): string {
	return (
		ctx.guild.members.cache.get(id)?.displayName ??
		ctx.client.users.cache.get(id)?.username ??
		id
	);
}

async function memberAvatar(
	ctx: StatsContext,
	id: string
): Promise<Buffer | null> {
	const user =
		ctx.guild.members.cache.get(id)?.user ?? ctx.client.users.cache.get(id);
	return user
		? fetchAvatar(
				user.displayAvatarURL({ extension: "png", size: 128 })
			).catch(() => null)
		: null;
}

function channelName(ctx: StatsContext, id: string): string {
	return ctx.guild.channels.cache.get(id)?.name ?? `#${id.slice(-4)}`;
}

function footer(ctx: StatsContext) {
	return {
		locale: ctx.locale,
		footerLeft: ctx.signature,
		footerRight: ctx.lang.stats_footer_zone.replace(
			"${zone}",
			ctx.clock.timeZone
		)
	};
}

function channelRows(
	ctx: StatsContext,
	s: ActivitySummary,
	kind: "text" | "voice",
	n: number
): BarRow[] {
	const list = kind === "text" ? s.textChannels : s.voiceChannels;
	const total = list.reduce((a, c) => a + c.value, 0) || 1;
	return list.slice(0, n).map((c) => ({
		name: channelName(ctx, c.id),
		value: c.value,
		display: kind === "text" ? compact(c.value) : formatDuration(c.value),
		icon: kind,
		detail: `${Math.round((c.value / total) * 100)} %`
	}));
}

async function memberRows(
	ctx: StatsContext,
	list: MemberTotals[],
	metric: "messages" | "voiceMs"
): Promise<BarRow[]> {
	return Promise.all(
		list.map(async (t) => ({
			name: memberName(ctx, t.id),
			value: t[metric],
			display:
				metric === "messages"
					? compact(t.messages)
					: formatDuration(t.voiceMs),
			avatar: await memberAvatar(ctx, t.id)
		}))
	);
}

/** Sentences shared by the user, server and channel views. */
function insights(ctx: StatsContext, s: ActivitySummary): string[] {
	const e = ctx.client.iHorizon_Emojis;
	const days = weekdayNames(ctx.locale, "long");
	const out: string[] = [];
	const pk = peak(s.messageHeat) ?? peak(s.voiceHeat);
	if (pk) {
		out.push(
			`${e.Schedule} ${ctx.lang.stats_insight_peak
				.replace("${day}", days[pk.weekday])
				.replace("${hour}", hourLabel(ctx.locale, pk.hour))}`
		);
	}
	const c = change(s.messagesWeek, s.messagesPrevWeek);
	if (c) {
		out.push(
			`${e.Stats} ${(c > 0
				? ctx.lang.stats_insight_up
				: ctx.lang.stats_insight_down
			).replace("${change}", String(Math.abs(c)))}`
		);
	}
	return out;
}

function rhythmView(
	ctx: StatsContext,
	s: ActivitySummary,
	header: Parameters<typeof renderRhythm>[0]["header"],
	figures: Figure[]
): StatsView {
	return {
		id: "rhythm",
		label: ctx.lang.stats_view_rhythm,
		description: ctx.lang.stats_view_rhythm_desc,
		build: async () => {
			const longDays = weekdayNames(ctx.locale, "long");
			const note = (h: ActivitySummary["messageHeat"]) => {
				const p = peak(h);
				return p
					? ctx.lang.stats_peak_note
							.replace("${day}", longDays[p.weekday])
							.replace("${hour}", hourLabel(ctx.locale, p.hour))
					: null;
			};
			const image = await renderRhythm({
				...footer(ctx),
				header,
				weekdays: weekdayNames(ctx.locale),
				figures,
				blocks: [
					{
						title: ctx.lang.stats_heat_messages,
						heat: s.messageHeat,
						color: PALETTE.messages,
						peak: peak(s.messageHeat),
						note: note(s.messageHeat)
					},
					{
						title: ctx.lang.stats_heat_voice,
						heat: s.voiceHeat,
						color: PALETTE.voice,
						peak: peak(s.voiceHeat),
						note: note(s.voiceHeat)
					}
				]
			});
			const day = busiestWeekday(s.messageHeat);
			const lines = insights(ctx, s).slice(0, 1);
			if (day !== null && lines.length === 0)
				lines.push(
					`${ctx.client.iHorizon_Emojis.Schedule} ${longDays[day]}`
				);
			return { image, insights: lines };
		}
	};
}

/* ------------------------------------------------------------------ */
/* Views                                                               */
/* ------------------------------------------------------------------ */

export async function userViews(
	ctx: StatsContext,
	userId: string
): Promise<StatsView[] | null> {
	const own = ctx.stats[userId];
	const s = summarize(own ? [own] : [], ctx.clock);
	if (s.messages === 0 && s.voiceMs === 0) return null;
	const { lang } = ctx;
	const member = ctx.guild.members.cache.get(userId);
	const user = member?.user ?? ctx.client.users.cache.get(userId);
	const header = {
		title: memberName(ctx, userId),
		subtitle: `@${user?.username ?? userId} · ${ctx.guild.name}`,
		avatar: await memberAvatar(ctx, userId)
	};
	const totals = memberTotals(ctx.stats, ctx.clock.now, "30d");
	const rank = rankOf(totals, userId, s.messages ? "messages" : "voiceMs");

	const overview: StatsView = {
		id: "overview",
		label: lang.stats_view_overview,
		description: lang.stats_view_overview_desc,
		build: async () => {
			const image = await renderOverview({
				...footer(ctx),
				header,
				figures: [
					{
						label: lang.stats_label_messages,
						value: compact(s.messages),
						color: PALETTE.messages,
						...changeNote(lang, s.messagesWeek, s.messagesPrevWeek)
					},
					{
						label: lang.stats_label_voice,
						value: formatDuration(s.voiceMs),
						color: PALETTE.voice,
						...changeNote(lang, s.voiceWeekMs, s.voicePrevWeekMs)
					},
					{
						label: lang.stats_label_active_days,
						value: `${s.activeDays}/30`,
						note: lang.stats_note_streak.replace(
							"${days}",
							String(s.currentStreak)
						),
						tone: "muted"
					},
					rank
						? {
								label: lang.stats_label_rank,
								value: `#${rank.rank}`,
								note: lang.stats_note_rank_of.replace(
									"${count}",
									String(rank.of)
								),
								tone: "muted"
							}
						: {
								label: lang.stats_label_rank,
								value: "-",
								note: lang.stats_note_unranked,
								tone: "muted"
							}
				],
				daily: {
					days: s.days,
					messages: s.dailyMessages,
					voiceMinutes: s.dailyVoiceMinutes
				},
				dailyLabels: {
					title: lang.stats_chart_daily,
					messages: lang.stats_label_messages,
					voice: lang.stats_chart_voice_minutes
				},
				left: {
					title: lang.stats_text_channels,
					color: PALETTE.messages,
					rows: channelRows(ctx, s, "text", 5)
				},
				right: {
					title: lang.stats_voice_channels,
					color: PALETTE.voice,
					rows: channelRows(ctx, s, "voice", 5)
				},
				empty: lang.stats_empty
			});
			const lines = insights(ctx, s);
			const fav = s.textChannels[0];
			if (fav)
				lines.push(
					`${ctx.client.iHorizon_Emojis.Ticket_Hash} ${lang.stats_insight_channel.replace("${channel}", `<#${fav.id}>`)}`
				);
			if (s.currentStreak >= 3)
				lines.push(
					`${ctx.client.iHorizon_Emojis.Sparkles} ${lang.stats_insight_streak.replace("${days}", String(s.currentStreak))}`
				);
			return { image, insights: lines };
		}
	};

	return [
		overview,
		rhythmView(ctx, s, header, [
			{
				label: lang.stats_label_avg_length,
				value: String(s.avgMessageLength),
				note: lang.stats_note_chars,
				tone: "muted"
			},
			{
				label: lang.stats_label_sessions,
				value: String(s.sessions),
				note: lang.stats_note_avg_session.replace(
					"${duration}",
					formatDuration(s.avgSessionMs)
				),
				tone: "muted"
			},
			{
				label: lang.stats_label_longest_session,
				value: formatDuration(s.longestSessionMs),
				color: PALETTE.voice
			},
			{
				label: lang.stats_label_best_streak,
				value: String(s.longestStreak),
				note: lang.stats_note_days_in_row,
				tone: "muted"
			}
		])
	];
}

export async function guildViews(
	ctx: StatsContext
): Promise<StatsView[] | null> {
	const s = summarize(Object.values(ctx.stats), ctx.clock);
	if (s.messages === 0 && s.voiceMs === 0) return null;
	const { lang, guild } = ctx;
	const header = {
		title: guild.name,
		subtitle: lang.stats_period_30d,
		avatar: await fetchAvatar(
			guild.iconURL({ extension: "png", size: 128 })
		).catch(() => null)
	};
	const totals = memberTotals(ctx.stats, ctx.clock.now, "30d");
	const active = totals.filter((t) => t.messages > 0 || t.voiceMs > 0).length;
	const pk = peak(s.messageHeat) ?? peak(s.voiceHeat);
	const longDays = weekdayNames(ctx.locale, "long");
	const topMessages = leaderboard(totals, "messages", 5);
	const topVoice = leaderboard(totals, "voiceMs", 5);

	const overview: StatsView = {
		id: "overview",
		label: lang.stats_view_overview,
		description: lang.stats_view_overview_desc,
		build: async () => {
			const image = await renderOverview({
				...footer(ctx),
				header,
				figures: [
					{
						label: lang.stats_label_messages,
						value: compact(s.messages),
						color: PALETTE.messages,
						...changeNote(lang, s.messagesWeek, s.messagesPrevWeek)
					},
					{
						label: lang.stats_label_voice,
						value: formatDuration(s.voiceMs),
						color: PALETTE.voice,
						...changeNote(lang, s.voiceWeekMs, s.voicePrevWeekMs)
					},
					{
						label: lang.stats_label_active_members,
						value: compact(active),
						note: lang.stats_note_rank_of.replace(
							"${count}",
							compact(guild.memberCount)
						),
						tone: "muted"
					},
					{
						label: lang.stats_label_peak,
						value: pk ? hourLabel(ctx.locale, pk.hour) : "-",
						note: pk ? longDays[pk.weekday] : undefined,
						tone: "muted"
					}
				],
				daily: {
					days: s.days,
					messages: s.dailyMessages,
					voiceMinutes: s.dailyVoiceMinutes
				},
				dailyLabels: {
					title: lang.stats_chart_daily,
					messages: lang.stats_label_messages,
					voice: lang.stats_chart_voice_minutes
				},
				left: {
					title: lang.stats_top_messages,
					color: PALETTE.messages,
					rows: await memberRows(ctx, topMessages, "messages"),
					ranked: true
				},
				right: {
					title: lang.stats_top_voice,
					color: PALETTE.voice,
					rows: await memberRows(ctx, topVoice, "voiceMs"),
					ranked: true
				},
				empty: lang.stats_empty
			});
			const lines = insights(ctx, s);
			if (topMessages[0]) {
				lines.push(
					`${ctx.client.iHorizon_Emojis.Crown} ${lang.stats_insight_leader.replace("${user}", `<@${topMessages[0].id}>`).replace("${value}", `${compact(topMessages[0].messages)} ${lang.stats_label_messages.toLowerCase()}`)}`
				);
			}
			return { image, insights: lines };
		}
	};

	const channels: StatsView = {
		id: "channels",
		label: lang.stats_view_channels,
		description: lang.stats_view_channels_desc,
		build: async () => {
			const image = await renderRanking({
				...footer(ctx),
				header,
				title: lang.stats_text_channels,
				color: PALETTE.messages,
				rows: channelRows(ctx, s, "text", 8),
				empty: lang.stats_empty,
				right: {
					title: lang.stats_voice_channels,
					color: PALETTE.voice,
					rows: channelRows(ctx, s, "voice", 8)
				}
			});
			const lines: string[] = [];
			if (s.textChannels[0])
				lines.push(
					`${ctx.client.iHorizon_Emojis.Ticket_Hash} ${lang.stats_insight_channel.replace("${channel}", `<#${s.textChannels[0].id}>`)}`
				);
			if (s.voiceChannels[0])
				lines.push(
					`${ctx.client.iHorizon_Emojis.Voice_Channel} ${lang.stats_insight_channel.replace("${channel}", `<#${s.voiceChannels[0].id}>`)}`
				);
			return { image, insights: lines };
		}
	};

	return [
		overview,
		rhythmView(ctx, s, header, [
			{
				label: lang.stats_label_avg_length,
				value: String(s.avgMessageLength),
				note: lang.stats_note_chars,
				tone: "muted"
			},
			{
				label: lang.stats_label_sessions,
				value: compact(s.sessions),
				note: lang.stats_note_avg_session.replace(
					"${duration}",
					formatDuration(s.avgSessionMs)
				),
				tone: "muted"
			},
			{
				label: lang.stats_label_longest_session,
				value: formatDuration(s.longestSessionMs),
				color: PALETTE.voice
			},
			{
				label: lang.stats_label_active_days,
				value: `${s.activeDays}/30`,
				tone: "muted"
			}
		]),
		channels
	];
}

export async function channelViews(
	ctx: StatsContext,
	channelId: string
): Promise<StatsView[] | null> {
	const s = summarize(Object.values(ctx.stats), ctx.clock, channelId);
	if (s.messages === 0 && s.voiceMs === 0) return null;
	const { lang } = ctx;
	const name = channelName(ctx, channelId);
	const header = {
		title: `#${name}`,
		subtitle: `${ctx.guild.name} · ${lang.stats_period_30d}`,
		avatar: null,
		color:
			s.voiceMs > 0 && s.messages === 0 ? PALETTE.voice : PALETTE.messages
	};
	const members = channelMembers(ctx.stats, channelId, ctx.clock.now);
	const pk = peak(s.messageHeat) ?? peak(s.voiceHeat);
	const longDays = weekdayNames(ctx.locale, "long");
	const byMessages = leaderboard(members, "messages", 5);
	const byVoice = leaderboard(members, "voiceMs", 5);

	const overview: StatsView = {
		id: "overview",
		label: lang.stats_view_overview,
		description: lang.stats_view_overview_desc,
		build: async () => {
			const image = await renderOverview({
				...footer(ctx),
				header,
				figures: [
					{
						label: lang.stats_label_messages,
						value: compact(s.messages),
						color: PALETTE.messages,
						...changeNote(lang, s.messagesWeek, s.messagesPrevWeek)
					},
					{
						label: lang.stats_label_voice,
						value: formatDuration(s.voiceMs),
						color: PALETTE.voice,
						...changeNote(lang, s.voiceWeekMs, s.voicePrevWeekMs)
					},
					{
						label: lang.stats_label_members,
						value: compact(members.length),
						tone: "muted"
					},
					{
						label: lang.stats_label_peak,
						value: pk ? hourLabel(ctx.locale, pk.hour) : "-",
						note: pk ? longDays[pk.weekday] : undefined,
						tone: "muted"
					}
				],
				daily: {
					days: s.days,
					messages: s.dailyMessages,
					voiceMinutes: s.dailyVoiceMinutes
				},
				dailyLabels: {
					title: lang.stats_chart_daily,
					messages: lang.stats_label_messages,
					voice: lang.stats_chart_voice_minutes
				},
				left: {
					title: lang.stats_top_messages,
					color: PALETTE.messages,
					rows: await memberRows(ctx, byMessages, "messages"),
					ranked: true
				},
				right: {
					title: lang.stats_top_voice,
					color: PALETTE.voice,
					rows: await memberRows(ctx, byVoice, "voiceMs"),
					ranked: true
				},
				empty: lang.stats_empty
			});
			const lines = insights(ctx, s);
			const lead = byMessages[0] ?? byVoice[0];
			if (lead) {
				const value = byMessages[0]
					? `${compact(lead.messages)} ${lang.stats_label_messages.toLowerCase()}`
					: formatDuration(lead.voiceMs);
				lines.push(
					`${ctx.client.iHorizon_Emojis.Crown} ${lang.stats_insight_leader.replace("${user}", `<@${lead.id}>`).replace("${value}", value)}`
				);
			}
			return { image, insights: lines };
		}
	};

	return [
		overview,
		rhythmView(ctx, s, header, [
			{
				label: lang.stats_label_avg_length,
				value: String(s.avgMessageLength),
				note: lang.stats_note_chars,
				tone: "muted"
			},
			{
				label: lang.stats_label_sessions,
				value: compact(s.sessions),
				note: lang.stats_note_avg_session.replace(
					"${duration}",
					formatDuration(s.avgSessionMs)
				),
				tone: "muted"
			},
			{
				label: lang.stats_label_longest_session,
				value: formatDuration(s.longestSessionMs),
				color: PALETTE.voice
			},
			{
				label: lang.stats_label_active_days,
				value: `${s.activeDays}/30`,
				tone: "muted"
			}
		])
	];
}

export async function compareView(
	ctx: StatsContext,
	aId: string,
	bId: string
): Promise<StatsView[] | null> {
	const a = summarize(ctx.stats[aId] ? [ctx.stats[aId]] : [], ctx.clock);
	const b = summarize(ctx.stats[bId] ? [ctx.stats[bId]] : [], ctx.clock);
	if (!a.messages && !a.voiceMs && !b.messages && !b.voiceMs) return null;
	const { lang } = ctx;
	const rows = [
		{
			label: lang.stats_label_messages,
			a: a.messages,
			b: b.messages,
			aText: compact(a.messages),
			bText: compact(b.messages)
		},
		{
			label: lang.stats_label_voice,
			a: a.voiceMs,
			b: b.voiceMs,
			aText: formatDuration(a.voiceMs),
			bText: formatDuration(b.voiceMs)
		},
		{
			label: lang.stats_label_active_days,
			a: a.activeDays,
			b: b.activeDays,
			aText: String(a.activeDays),
			bText: String(b.activeDays)
		},
		{
			label: lang.stats_label_best_streak,
			a: a.longestStreak,
			b: b.longestStreak,
			aText: String(a.longestStreak),
			bText: String(b.longestStreak)
		},
		{
			label: lang.stats_label_sessions,
			a: a.sessions,
			b: b.sessions,
			aText: String(a.sessions),
			bText: String(b.sessions)
		},
		{
			label: lang.stats_label_avg_length,
			a: a.avgMessageLength,
			b: b.avgMessageLength,
			aText: String(a.avgMessageLength),
			bText: String(b.avgMessageLength)
		}
	];
	return [
		{
			id: "compare",
			label: lang.stats_view_overview,
			description: lang.stats_view_overview_desc,
			build: async () => {
				const image = await renderCompare({
					...footer(ctx),
					a: {
						name: memberName(ctx, aId),
						avatar: await memberAvatar(ctx, aId),
						color: PALETTE.messages
					},
					b: {
						name: memberName(ctx, bId),
						avatar: await memberAvatar(ctx, bId),
						color: PALETTE.voice
					},
					rows,
					daily: {
						days: a.days,
						a: a.dailyMessages,
						b: b.dailyMessages,
						title: lang.stats_chart_messages_per_day
					}
				});
				const aWins = rows.filter((r) => r.a > r.b).length;
				const bWins = rows.filter((r) => r.b > r.a).length;
				const lead =
					aWins === bWins
						? null
						: aWins > bWins
							? { id: aId, n: aWins }
							: { id: bId, n: bWins };
				return {
					image,
					insights: [
						lead
							? `${ctx.client.iHorizon_Emojis.Crown} ${lang.stats_insight_compare.replace("${user}", `<@${lead.id}>`).replace("${count}", String(lead.n)).replace("${total}", String(rows.length))}`
							: `${ctx.client.iHorizon_Emojis.Stats} ${lang.stats_insight_tie}`
					]
				};
			}
		}
	];
}

export async function topView(
	ctx: StatsContext,
	metric: "messages" | "voiceMs",
	period: Period,
	limit: number
): Promise<StatsView[] | null> {
	const totals = memberTotals(ctx.stats, ctx.clock.now, period);
	const list = leaderboard(totals, metric, limit);
	if (list.length === 0) return null;
	const { lang } = ctx;
	const periodLabel =
		period === "1d"
			? lang.stats_period_1d
			: period === "7d"
				? lang.stats_period_7d
				: lang.stats_period_30d;
	const color = metric === "messages" ? PALETTE.messages : PALETTE.voice;
	return [
		{
			id: "top",
			label: lang.stats_view_members,
			description: lang.stats_view_members_desc,
			build: async () => {
				const image = await renderRanking({
					...footer(ctx),
					header: {
						title:
							metric === "messages"
								? lang.stats_title_top_messages
								: lang.stats_title_top_voice,
						subtitle: `${ctx.guild.name} · ${periodLabel}`,
						avatar: await fetchAvatar(
							ctx.guild.iconURL({ extension: "png", size: 128 })
						).catch(() => null),
						color
					},
					title:
						metric === "messages"
							? lang.stats_label_messages
							: lang.stats_label_voice,
					color,
					rows: await memberRows(ctx, list, metric),
					empty: lang.stats_empty
				});
				const first = list[0];
				const value =
					metric === "messages"
						? `${compact(first.messages)} ${lang.stats_label_messages.toLowerCase()}`
						: formatDuration(first.voiceMs);
				return {
					image,
					insights: [
						`${ctx.client.iHorizon_Emojis.Crown} ${lang.stats_insight_leader.replace("${user}", `<@${first.id}>`).replace("${value}", value)}`
					]
				};
			}
		}
	];
}

/* ------------------------------------------------------------------ */
/* The card                                                            */
/* ------------------------------------------------------------------ */

export interface CardSpec {
	title: string;
	emoji: string;
	accent?: number;
	views: StatsView[];
}

/** Sends the card for the first view; the menu swaps views in place. */
export async function sendStatsCard(
	ctx: StatsContext,
	spec: CardSpec
): Promise<void> {
	const { client, interaction, lang } = ctx;
	const authorId =
		interaction instanceof Message
			? interaction.author.id
			: interaction.user.id;
	const cache = new Map<string, { image: Buffer; insights: string[] }>();
	const render = async (id: string) => {
		let hit = cache.get(id);
		if (!hit) {
			hit = await spec.views.find((v) => v.id === id)!.build();
			cache.set(id, hit);
		}
		return hit;
	};
	const fileName = (id: string) => `stats-${id}.png`;

	const card = (
		id: string,
		data: { insights: string[] },
		disabled = false
	) => {
		const container = new ContainerBuilder().setAccentColor(
			spec.accent ?? 0x6c8bff
		);
		const head = [
			`## ${spec.emoji} ${escapeMarkdown(spec.title)}`,
			...data.insights
		];
		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(head.join("\n"))
		);
		container.addMediaGalleryComponents(
			new MediaGalleryBuilder().addItems(
				new MediaGalleryItemBuilder().setURL(
					`attachment://${fileName(id)}`
				)
			)
		);
		if (spec.views.length > 1) {
			container.addActionRowComponents(
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId(SELECT_ID)
						.setPlaceholder(lang.stats_select_placeholder)
						.setDisabled(disabled)
						.addOptions(
							spec.views.map((v) => ({
								label: v.label,
								description: v.description,
								value: v.id,
								default: v.id === id
							}))
						)
				)
			);
		}
		container.addSeparatorComponents(
			new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
		);
		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(`-# ${ctx.signature}`)
		);
		return container;
	};

	let current = spec.views[0].id;
	const first = await render(current);
	const message = await client.func.method.interactionSend(interaction, {
		components: [card(current, first)],
		files: [
			new AttachmentBuilder(first.image, { name: fileName(current) })
		],
		flags: [MessageFlags.IsComponentsV2],
		allowedMentions: { parse: [] }
	} as never);
	if (spec.views.length < 2) return;

	const collector = message.createMessageComponentCollector({
		time: COLLECTOR_MS
	});
	collector.on("collect", async (i) => {
		if (!i.isStringSelectMenu() || i.customId !== SELECT_ID) return;
		if (i.user.id !== authorId) {
			await i.reply({
				content: lang.help_not_for_you,
				flags: [MessageFlags.Ephemeral]
			});
			return;
		}
		await i.deferUpdate();
		current = i.values[0];
		const data = await render(current);
		await i.editReply({
			components: [card(current, data)],
			files: [
				new AttachmentBuilder(data.image, { name: fileName(current) })
			],
			attachments: []
		});
	});
	collector.on("end", async () => {
		const data = cache.get(current);
		if (!data) return;
		await message
			.edit({
				components: [card(current, data, true)],
				allowedMentions: { parse: [] }
			} as never)
			.catch(() => undefined);
	});
}

export type { Period } from "./statsAnalytics.js";
