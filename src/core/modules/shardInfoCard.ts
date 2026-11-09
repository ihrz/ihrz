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

import type { LanguageData } from "../../../types/languageData.js";
import type { ShardData, ShardProbe } from "../functions/shard_helper.ts";

type ShardState = "online" | "starting" | "offline";

export interface ShardTotals {
	shardCount: number;
	onlineCount: number;
	guilds: number;
	unavailable: number;
	exactMembers: number;
	approximateMembers: number;
	missingMembers: number;
	members: number;
	channels: number;
	voice: number;
	rss: number;
	averagePing: number | null;
	highestPing: number | null;
	offlineIds: number[];
}

const STATE_COLORS: Record<ShardState, string> = {
	online: "#34d399",
	starting: "#fbbf24",
	offline: "#f43f5e"
};

const WIDTH = 1000;
const PAD = 32;
const INNER = WIDTH - PAD * 2;
const GAP = 14;
const MUTED = "#8f92a6";
const INK = "#e9e9f2";
const TILES_Y = 132;
const TILE_H = 116;
const CHARTS_Y = TILES_Y + TILE_H + GAP;
const CHART_H = 216;
const GRID_Y = CHARTS_Y + CHART_H + GAP;
const CARD_H = 176;
const LARGE_SHARD_COUNT = 32;

function stateOf(probe: ShardProbe): ShardState {
	if (!probe.data) return "offline";
	return probe.data.status === 0 ? "online" : "starting";
}

export function summarizeShards(probes: ShardProbe[]): ShardTotals {
	const answered = probes.flatMap((probe) =>
		probe.data ? [probe.data] : []
	);
	const sum = (pick: (data: ShardData) => number) =>
		answered.reduce((total, data) => total + pick(data), 0);
	const pings = answered.map((data) => data.ping).filter((ping) => ping >= 0);

	return {
		shardCount: probes.length,
		onlineCount: probes.filter((probe) => stateOf(probe) === "online")
			.length,
		guilds: sum((data) => data.guilds),
		unavailable: sum((data) => data.unavailable),
		exactMembers: sum((data) => data.exactMembers),
		approximateMembers: sum((data) => data.approximateMembers),
		missingMembers: sum((data) => data.missingMembers),
		members: sum((data) => data.members),
		channels: sum((data) => data.channels),
		voice: sum((data) => data.voice),
		rss: sum((data) => data.rss),
		averagePing:
			pings.length > 0
				? Math.round(
						pings.reduce((total, ping) => total + ping, 0) /
							pings.length
					)
				: null,
		highestPing: pings.length > 0 ? Math.max(...pings) : null,
		offlineIds: probes
			.filter((probe) => !probe.data)
			.map((probe) => probe.id)
	};
}

function formatBytes(bytes: number): string {
	const megabytes = bytes / 1024 / 1024;
	return megabytes >= 1024
		? `${(megabytes / 1024).toFixed(1)} GB`
		: `${Math.round(megabytes)} MB`;
}

function formatPing(ping: number | null): string {
	return ping === null || ping < 0 ? "-" : `${ping} ms`;
}

function formatDuration(milliseconds: number, lang: LanguageData): string {
	const minutes = Math.floor(milliseconds / 60_000);
	const days = Math.floor(minutes / 1440);
	const hours = Math.floor((minutes % 1440) / 60);
	const day = lang.shardinfo_card_unit_day;
	const hour = lang.shardinfo_card_unit_hour;
	const minute = lang.shardinfo_card_unit_minute;
	if (days > 0) return `${days}${day} ${hours}${hour}`;
	if (hours > 0) return `${hours}${hour}`;
	return `${minutes}${minute}`;
}

function panel(x: number, y: number, width: number, height: number): string {
	return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="14" fill="#ffffff" fill-opacity="0.045" stroke="#ffffff" stroke-opacity="0.07"/>`;
}

function roundedBar(
	x: number,
	bottom: number,
	width: number,
	height: number
): string {
	const radius = Math.min(4, width / 2, height);
	const top = bottom - height;
	return `<path d="M${x},${bottom} V${top + radius} Q${x},${top} ${x + radius},${top} H${x + width - radius} Q${x + width},${top} ${x + width},${top + radius} V${bottom} Z" fill="url(#barFill)"/>`;
}

function gridColumns(shardCount: number): number {
	if (shardCount <= 2) return Math.max(shardCount, 1);
	if (shardCount === 4) return 2;
	return shardCount <= 9 ? 3 : 4;
}

async function barChart(
	x: number,
	width: number,
	title: string,
	probes: ShardProbe[],
	pick: (data: ShardData) => number,
	format: (value: number) => string,
	lang: LanguageData
): Promise<string> {
	const kit = client.func.svgKit;
	const parts = [panel(x, CHARTS_Y, width, CHART_H)];
	const left = x + 20;
	const plotWidth = width - 40;
	const top = CHARTS_Y + 74;
	const bottom = CHARTS_Y + CHART_H - 34;
	const plotHeight = bottom - top;
	const values = probes.map((probe) => (probe.data ? pick(probe.data) : 0));
	const peak = Math.max(...values, 1);
	const answered = probes.filter((probe) => probe.data).length;
	const average =
		values.reduce((total, value) => total + value, 0) /
		Math.max(answered, 1);
	const step = plotWidth / probes.length;
	const barWidth = Math.min(44, Math.max(step - 2, 1));
	const labelEvery = Math.max(1, Math.ceil(26 / step));
	const peakIndex = values.indexOf(Math.max(...values));

	parts.push(
		(
			await kit.text(title, {
				x: left,
				y: CHARTS_Y + 34,
				size: 17,
				weight: 700,
				fill: "#ffffff",
				maxWidth: plotWidth - 150
			})
		).markup,
		(
			await kit.text(
				lang.shardinfo_card_chart_average.replace(
					"${value}",
					format(Math.round(average))
				),
				{
					x: left + plotWidth,
					y: CHARTS_Y + 34,
					size: 13,
					fill: MUTED,
					anchor: "end",
					maxWidth: 145
				}
			)
		).markup,
		`<line x1="${left}" y1="${bottom}" x2="${left + plotWidth}" y2="${bottom}" stroke="#ffffff" stroke-opacity="0.12"/>`
	);

	const averageY = (bottom - (average / peak) * plotHeight).toFixed(1);
	parts.push(
		`<line x1="${left}" y1="${averageY}" x2="${left + plotWidth}" y2="${averageY}" stroke="#ffffff" stroke-opacity="0.28" stroke-dasharray="4 4"/>`
	);

	for (const [index, probe] of probes.entries()) {
		const barX = left + index * step + (step - barWidth) / 2;
		const centre = barX + barWidth / 2;
		if (!probe.data) {
			parts.push(
				`<rect x="${barX}" y="${bottom - 4}" width="${barWidth}" height="4" fill="${STATE_COLORS.offline}"/>`
			);
		} else if (values[index] > 0) {
			parts.push(
				roundedBar(
					barX,
					bottom,
					barWidth,
					Math.max((values[index] / peak) * plotHeight, 2)
				)
			);
		}
		if (index === peakIndex && values[index] > 0) {
			parts.push(
				(
					await kit.text(format(values[index]), {
						x: Math.min(
							Math.max(centre, left + 24),
							left + plotWidth - 24
						),
						y: bottom - (values[index] / peak) * plotHeight - 8,
						size: 13,
						weight: 700,
						fill: INK,
						anchor: "middle"
					})
				).markup
			);
		}
		if (index % labelEvery === 0) {
			parts.push(
				(
					await kit.text(String(probe.id), {
						x: centre,
						y: bottom + 20,
						size: 12,
						fill: MUTED,
						anchor: "middle"
					})
				).markup
			);
		}
	}

	return parts.join("");
}

async function shardCard(
	probe: ShardProbe,
	x: number,
	y: number,
	width: number,
	highestGuilds: number,
	totalGuilds: number,
	currentShardId: number,
	lang: LanguageData
): Promise<string> {
	const kit = client.func.svgKit;
	const state = stateOf(probe);
	const color = STATE_COLORS[state];
	const parts: string[] = [panel(x, y, width, CARD_H)];
	const add = async (
		value: string,
		options: Parameters<typeof kit.text>[1]
	) => parts.push((await kit.text(value, options)).markup);
	const left = x + 16;
	const contentWidth = width - 32;
	const statusLabel = lang[`shardinfo_card_state_${state}`];
	const statusWidth = Math.min(
		await kit.measure(statusLabel, { size: 12 }),
		contentWidth / 2
	);
	const statusX = x + width - 16 - statusWidth;

	if (probe.id === currentShardId) {
		parts.push(
			`<rect x="${x}" y="${y}" width="${width}" height="${CARD_H}" rx="14" fill="none" stroke="#ff40c4" stroke-opacity="0.65" stroke-width="1.5"/>`
		);
	}
	await add(
		lang.shardinfo_card_shard.replace("${shardId}", String(probe.id)),
		{
			x: left,
			y: y + 30,
			size: 17,
			weight: 700,
			fill: "#ffffff",
			maxWidth: contentWidth / 2 - 8
		}
	);
	parts.push(
		`<circle cx="${statusX - 11}" cy="${y + 25}" r="4.5" fill="${color}"/>`
	);
	await add(statusLabel, {
		x: statusX,
		y: y + 30,
		size: 12,
		fill: INK,
		maxWidth: contentWidth / 2
	});

	if (!probe.data) {
		await add(lang.shardinfo_card_no_response, {
			x: x + width / 2,
			y: y + CARD_H / 2 + 16,
			size: 14,
			fill: MUTED,
			anchor: "middle",
			maxWidth: contentWidth
		});
		return parts.join("");
	}

	const data = probe.data;
	const guilds = data.guilds.toLocaleString("en-US");
	const guildsWidth = await kit.measure(guilds, { size: 26, weight: 700 });
	await add(guilds, {
		x: left,
		y: y + 68,
		size: 26,
		weight: 700,
		fill: "#ffffff"
	});
	await add(lang.shardinfo_card_servers_unit, {
		x: left + guildsWidth + 7,
		y: y + 68,
		size: 12,
		fill: MUTED,
		maxWidth: contentWidth - guildsWidth - 60
	});
	await add(
		`${((data.guilds / Math.max(totalGuilds, 1)) * 100).toFixed(1)}%`,
		{
			x: x + width - 16,
			y: y + 68,
			size: 13,
			fill: INK,
			anchor: "end"
		}
	);

	const shareWidth = Math.max(
		(data.guilds / Math.max(highestGuilds, 1)) * contentWidth,
		data.guilds > 0 ? 6 : 0
	);
	parts.push(
		`<rect x="${left}" y="${y + 78}" width="${contentWidth}" height="6" rx="3" fill="#ffffff" fill-opacity="0.08"/>`,
		`<rect x="${left}" y="${y + 78}" width="${shareWidth.toFixed(1)}" height="6" rx="3" fill="url(#shareFill)"/>`
	);

	const metrics = [
		[
			lang.shardinfo_card_members,
			client.func.numberBeautifuer(data.members)
		],
		[
			lang.shardinfo_card_channels,
			client.func.numberBeautifuer(data.channels)
		],
		[lang.shardinfo_card_voice, data.voice.toLocaleString("en-US")],
		[lang.shardinfo_card_shard_ping, formatPing(data.ping)],
		[lang.shardinfo_card_memory, formatBytes(data.rss)],
		[lang.shardinfo_card_uptime, formatDuration(data.uptime, lang)]
	];
	const columnWidth = contentWidth / 3;
	for (const [index, [label, value]] of metrics.entries()) {
		const metricX = left + (index % 3) * columnWidth;
		const metricY = y + 106 + Math.floor(index / 3) * 38;
		await add(label, {
			x: metricX,
			y: metricY,
			size: 11,
			fill: MUTED,
			maxWidth: columnWidth - 6
		});
		await add(value, {
			x: metricX,
			y: metricY + 18,
			size: 14,
			weight: 700,
			fill: INK,
			maxWidth: columnWidth - 6
		});
	}

	return parts.join("");
}

export async function renderShardInfoCard(
	probes: ShardProbe[],
	currentShardId: number,
	pid: number,
	lang: LanguageData,
	avatar: Buffer | null
): Promise<Buffer> {
	const kit = client.func.svgKit;
	const beautify = client.func.numberBeautifuer;
	const totals = summarizeShards(probes);
	const stateColor =
		totals.onlineCount === totals.shardCount
			? STATE_COLORS.online
			: totals.offlineIds.length > 0
				? STATE_COLORS.offline
				: STATE_COLORS.starting;
	const parts: string[] = [];
	const add = async (
		value: string,
		options: Parameters<typeof kit.text>[1]
	) => parts.push((await kit.text(value, options)).markup);
	const textX = avatar ? PAD + 82 : PAD;
	const pillLabel = lang.shardinfo_card_pill
		.replace("${onlineCount}", String(totals.onlineCount))
		.replace("${shardCount}", String(totals.shardCount));
	const pillWidth =
		(await kit.measure(pillLabel, { size: 16, weight: 700 })) + 56;
	const pillX = WIDTH - PAD - pillWidth;

	if (avatar) {
		parts.push(
			kit.image(avatar, {
				x: PAD,
				y: 34,
				width: 66,
				height: 66,
				radius: "circle"
			}).markup
		);
	}
	await add(lang.shardinfo_card_title, {
		x: textX,
		y: 66,
		size: 32,
		weight: 700,
		fill: "#ffffff",
		maxWidth: pillX - textX - 20
	});
	await add(
		lang.shardinfo_card_summary
			.replace("${shardId}", String(currentShardId))
			.replace("${pid}", String(pid)),
		{ x: textX, y: 96, size: 16, fill: MUTED, maxWidth: pillX - textX - 20 }
	);
	parts.push(
		`<rect x="${pillX}" y="46" width="${pillWidth}" height="42" rx="21" fill="${stateColor}" fill-opacity="0.15" stroke="${stateColor}" stroke-opacity="0.55"/>`,
		`<circle cx="${pillX + 25}" cy="67" r="10" fill="${stateColor}" fill-opacity="0.3"/>`,
		`<circle cx="${pillX + 25}" cy="67" r="5" fill="${stateColor}"/>`
	);
	await add(pillLabel, {
		x: pillX + 42,
		y: 73,
		size: 16,
		weight: 700,
		fill: "#ffffff"
	});

	const available = totals.guilds - totals.unavailable;
	const tiles = [
		{
			label: lang.shardinfo_card_servers,
			value: beautify(totals.guilds),
			detail: lang.shardinfo_card_servers_detail.replace(
				"${unavailableCount}",
				totals.unavailable.toLocaleString("en-US")
			)
		},
		{
			label: lang.shardinfo_card_members,
			value: beautify(totals.members),
			detail: lang.shardinfo_card_members_detail.replace(
				"${averageCount}",
				beautify(Math.round(totals.members / Math.max(available, 1)))
			)
		},
		{
			label: lang.shardinfo_card_ping,
			value: formatPing(totals.averagePing),
			detail: lang.shardinfo_card_ping_detail.replace(
				"${ping}",
				formatPing(totals.highestPing)
			)
		},
		{
			label: lang.shardinfo_card_memory,
			value: formatBytes(totals.rss),
			detail: lang.shardinfo_card_memory_detail.replace(
				"${size}",
				formatBytes(
					totals.rss /
						Math.max(probes.length - totals.offlineIds.length, 1)
				)
			)
		},
		{
			label: lang.shardinfo_card_voice,
			value: totals.voice.toLocaleString("en-US"),
			detail: lang.shardinfo_card_voice_detail.replace(
				"${channelCount}",
				beautify(totals.channels)
			)
		}
	];
	const tileWidth = (INNER - GAP * (tiles.length - 1)) / tiles.length;
	for (const [index, tile] of tiles.entries()) {
		const x = PAD + index * (tileWidth + GAP);
		parts.push(panel(x, TILES_Y, tileWidth, TILE_H));
		await add(tile.label, {
			x: x + 18,
			y: TILES_Y + 30,
			size: 14,
			fill: MUTED,
			maxWidth: tileWidth - 32
		});
		await add(tile.value, {
			x: x + 18,
			y: TILES_Y + 70,
			size: 30,
			weight: 700,
			fill: "#ffffff",
			maxWidth: tileWidth - 32
		});
		await add(tile.detail, {
			x: x + 18,
			y: TILES_Y + 98,
			size: 12,
			fill: MUTED,
			maxWidth: tileWidth - 32
		});
	}

	const chartWidth = (INNER - GAP) / 2;
	parts.push(
		await barChart(
			PAD,
			chartWidth,
			lang.shardinfo_card_chart_servers,
			probes,
			(data) => data.guilds,
			(value) => value.toLocaleString("en-US"),
			lang
		),
		await barChart(
			PAD + chartWidth + GAP,
			chartWidth,
			lang.shardinfo_card_chart_members,
			probes,
			(data) => data.members,
			beautify,
			lang
		)
	);

	const columns = gridColumns(probes.length);
	const cardWidth = (INNER - GAP * (columns - 1)) / columns;
	const highestGuilds = Math.max(
		...probes.map((probe) => probe.data?.guilds ?? 0)
	);
	for (const [index, probe] of probes.entries()) {
		parts.push(
			await shardCard(
				probe,
				PAD + (index % columns) * (cardWidth + GAP),
				GRID_Y + Math.floor(index / columns) * (CARD_H + GAP),
				cardWidth,
				highestGuilds,
				totals.guilds,
				currentShardId,
				lang
			)
		);
	}

	const rows = Math.ceil(probes.length / columns);
	const svg = kit.fill(client.svgfiles["shardInfo"], {
		height: GRID_Y + rows * CARD_H + (rows - 1) * GAP + PAD,
		state_color: stateColor,
		body: kit.raw(parts.join(""))
	});

	return client.func.svg2png(svg, {
		scale: probes.length > LARGE_SHARD_COUNT ? 1 : 2
	});
}
