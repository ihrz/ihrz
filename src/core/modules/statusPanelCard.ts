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
import {
	BEATS_SHOWN,
	type ServiceGroup,
	type ServiceState
} from "./uptimeKuma.ts";

export type OverallState = "operational" | "maintenance" | "degraded" | "major";

export interface StatusReport {
	overall: OverallState;
	upCount: number;
	totalCount: number;
	groups: ServiceGroup[];
	uptime24h: number | null;
	uptime30d: number | null;
	averageResponse: number | null;
	websocketPing: number | null;
	// Oldest first, null when no check answered.
	responseSeries: (number | null)[];
}

export const OVERALL_COLORS: Record<OverallState, string> = {
	operational: "#34d399",
	maintenance: "#60a5fa",
	degraded: "#fbbf24",
	major: "#f43f5e"
};

const STATE_COLORS: Record<ServiceState, string> = {
	up: "#34d399",
	down: "#f43f5e",
	pending: "#fbbf24",
	maintenance: "#60a5fa"
};

const WIDTH = 1000;
const PAD = 32;
const INNER = WIDTH - PAD * 2;
const MUTED = "#8f92a6";
const TILES_Y = 132;
const TILE_H = 96;
const TILE_GAP = 14;
const LIST_Y = TILES_Y + TILE_H + 18;
const GROUP_H = 44;
const ROW_H = 42;
const CHART_H = 184;
const BAR_W = 5;
const BAR_STEP = 7;
const BARS_X = 346;
const PING_X = BARS_X + BEATS_SHOWN * BAR_STEP + 78;
const UPTIME_X = WIDTH - PAD - 22;

export function formatUptime(ratio: number | null): string {
	return ratio === null ? "-" : `${(ratio * 100).toFixed(2)}%`;
}

function uptimeColor(ratio: number | null): string {
	if (ratio === null) return "#ffffff";
	if (ratio >= 0.995) return STATE_COLORS.up;
	return ratio >= 0.95 ? STATE_COLORS.pending : STATE_COLORS.down;
}

function panel(y: number, height: number): string {
	return `<rect x="${PAD}" y="${y}" width="${INNER}" height="${height}" rx="14" fill="#ffffff" fill-opacity="0.045" stroke="#ffffff" stroke-opacity="0.07"/>`;
}

function heartbeatBars(
	beats: ServiceGroup["services"][number]["beats"],
	y: number
): string {
	return beats
		.map((beat, index) => {
			const fill = beat
				? `fill="${STATE_COLORS[beat.state]}"`
				: 'fill="#ffffff" fill-opacity="0.08"';
			return `<rect x="${BARS_X + index * BAR_STEP}" y="${y}" width="${BAR_W}" height="20" rx="2" ${fill}/>`;
		})
		.join("");
}

function responseChart(
	series: (number | null)[],
	top: number,
	height: number
): { markup: string; peak: number } {
	const left = PAD + 22;
	const width = INNER - 44;
	const bottom = top + height;
	const values = series.filter((value): value is number => value !== null);
	const peak = values.length > 0 ? Math.max(...values) : 0;
	const ceiling = Math.max(peak * 1.15, 10);
	const xAt = (index: number) =>
		left + (width * index) / Math.max(series.length - 1, 1);
	const yAt = (value: number) => bottom - (value / ceiling) * height;

	let markup = "";
	for (let line = 0; line <= 3; line++) {
		const y = (top + (height * line) / 3).toFixed(1);
		markup += `<line x1="${left}" y1="${y}" x2="${left + width}" y2="${y}" stroke="#ffffff" stroke-opacity="0.06"/>`;
	}

	const segments: string[][] = [[]];
	series.forEach((value, index) => {
		if (value === null) segments.push([]);
		else {
			segments[segments.length - 1].push(
				`${xAt(index).toFixed(1)},${yAt(value).toFixed(1)}`
			);
		}
	});

	for (const points of segments) {
		if (points.length < 2) continue;
		const first = points[0].split(",")[0];
		const last = points[points.length - 1].split(",")[0];
		markup += `<path d="M${first},${bottom} L${points.join(" L")} L${last},${bottom} Z" fill="url(#chartFill)"/>`;
		markup += `<path d="M${points.join(" L")}" fill="none" stroke="url(#chartLine)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
	}

	return { markup, peak };
}

export async function renderStatusCard(
	report: StatusReport,
	lang: LanguageData,
	avatar: Buffer | null
): Promise<Buffer> {
	const kit = client.func.svgKit;
	const stateColor = OVERALL_COLORS[report.overall];
	const parts: string[] = [];
	const push = (markup: { markup: string }) => parts.push(markup.markup);
	const textX = avatar ? PAD + 82 : PAD;
	const stateLabel = lang[`status_panel_label_${report.overall}`];
	const pillTextWidth = await kit.measure(stateLabel, {
		size: 16,
		weight: 700
	});
	const pillWidth = pillTextWidth + 56;
	const pillX = WIDTH - PAD - pillWidth;

	if (avatar) {
		push(
			kit.image(avatar, {
				x: PAD,
				y: 34,
				width: 66,
				height: 66,
				radius: "circle"
			})
		);
	}
	push(
		await kit.text(lang.status_panel_card_title, {
			x: textX,
			y: 66,
			size: 32,
			weight: 700,
			fill: "#ffffff",
			maxWidth: pillX - textX - 20
		})
	);
	push(
		await kit.text(
			lang.status_panel_card_summary
				.replace("${upCount}", String(report.upCount))
				.replace("${totalCount}", String(report.totalCount)),
			{ x: textX, y: 96, size: 16, fill: MUTED, maxWidth: 560 }
		)
	);

	parts.push(
		`<rect x="${pillX}" y="46" width="${pillWidth}" height="42" rx="21" fill="${stateColor}" fill-opacity="0.15" stroke="${stateColor}" stroke-opacity="0.55"/>`,
		`<circle cx="${pillX + 25}" cy="67" r="10" fill="${stateColor}" fill-opacity="0.3"/>`,
		`<circle cx="${pillX + 25}" cy="67" r="5" fill="${stateColor}"/>`
	);
	push(
		await kit.text(stateLabel, {
			x: pillX + 42,
			y: 73,
			size: 16,
			weight: 700,
			fill: "#ffffff"
		})
	);

	const tileW = (INNER - TILE_GAP * 3) / 4;
	const tiles = [
		{
			label: lang.status_panel_card_uptime_24h,
			value: formatUptime(report.uptime24h),
			color: uptimeColor(report.uptime24h)
		},
		{
			label: lang.status_panel_card_uptime_30d,
			value: formatUptime(report.uptime30d),
			color: uptimeColor(report.uptime30d)
		},
		{
			label: lang.status_panel_card_response,
			value:
				report.averageResponse === null
					? "-"
					: `${report.averageResponse} ms`,
			color: "#ffffff"
		},
		{
			label: lang.status_panel_card_ws,
			value:
				report.websocketPing === null
					? "-"
					: `${report.websocketPing} ms`,
			color: "#ffffff"
		}
	];

	for (const [index, tile] of tiles.entries()) {
		const x = PAD + index * (tileW + TILE_GAP);
		parts.push(
			`<rect x="${x}" y="${TILES_Y}" width="${tileW}" height="${TILE_H}" rx="14" fill="#ffffff" fill-opacity="0.045" stroke="#ffffff" stroke-opacity="0.07"/>`
		);
		push(
			await kit.text(tile.label, {
				x: x + 20,
				y: TILES_Y + 34,
				size: 14,
				fill: MUTED,
				maxWidth: tileW - 36
			})
		);
		push(
			await kit.text(tile.value, {
				x: x + 20,
				y: TILES_Y + 74,
				size: 30,
				weight: 700,
				fill: tile.color
			})
		);
	}

	const rowCount = report.groups.reduce(
		(total, group) => total + group.services.length,
		0
	);
	const listH = report.groups.length * GROUP_H + rowCount * ROW_H + 14;
	parts.push(panel(LIST_Y, listH));

	let y = LIST_Y;
	for (const group of report.groups) {
		push(
			await kit.text(group.name, {
				x: PAD + 22,
				y: y + 31,
				size: 17,
				weight: 700,
				fill: "#ffffff",
				maxWidth: BARS_X - PAD - 40
			})
		);
		const heading = { y: y + 31, size: 12, fill: MUTED };
		push(
			await kit.text(lang.status_panel_card_col_history, {
				...heading,
				x: BARS_X
			})
		);
		push(
			await kit.text(lang.status_panel_card_col_ping, {
				...heading,
				x: PING_X,
				anchor: "end"
			})
		);
		push(
			await kit.text(lang.status_panel_card_col_uptime, {
				...heading,
				x: UPTIME_X,
				anchor: "end"
			})
		);
		y += GROUP_H;

		for (const service of group.services) {
			const color = STATE_COLORS[service.state];
			parts.push(
				`<circle cx="${PAD + 30}" cy="${y + 21}" r="9" fill="${color}" fill-opacity="0.22"/>`,
				`<circle cx="${PAD + 30}" cy="${y + 21}" r="4.5" fill="${color}"/>`,
				heartbeatBars(service.beats, y + 11)
			);
			push(
				await kit.text(service.name, {
					x: PAD + 50,
					y: y + 27,
					size: 16,
					fill: "#e9e9f2",
					maxWidth: BARS_X - PAD - 66
				})
			);
			push(
				await kit.text(
					service.ping === null ? "-" : `${service.ping} ms`,
					{
						x: PING_X,
						y: y + 27,
						size: 14,
						fill: "#e9e9f2",
						anchor: "end"
					}
				)
			);
			push(
				await kit.text(formatUptime(service.uptime30d), {
					x: UPTIME_X,
					y: y + 27,
					size: 14,
					weight: 700,
					fill: uptimeColor(service.uptime30d),
					anchor: "end"
				})
			);
			y += ROW_H;
		}
	}

	const chartY = LIST_Y + listH + 18;
	const chart = responseChart(
		report.responseSeries,
		chartY + 58,
		CHART_H - 78
	);
	parts.push(panel(chartY, CHART_H), chart.markup);
	push(
		await kit.text(lang.status_panel_card_chart, {
			x: PAD + 22,
			y: chartY + 36,
			size: 17,
			weight: 700,
			fill: "#ffffff",
			maxWidth: 600
		})
	);
	push(
		await kit.text(`${chart.peak} ms`, {
			x: WIDTH - PAD - 22,
			y: chartY + 36,
			size: 14,
			fill: MUTED,
			anchor: "end"
		})
	);

	const svg = kit.fill(client.svgfiles["infrastructureStatus"], {
		height: chartY + CHART_H + PAD,
		state_color: stateColor,
		body: kit.raw(parts.join(""))
	});

	return client.func.svg2png(svg, { scale: 2 });
}
