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

/*
 * Stats pages (leaderboards, guild/channel/user stats, charts) rendered
 * with resvg. A page is a header plus a stack of blocks; every block lays
 * itself out from the font metrics and returns its height, so pages grow
 * with their content instead of being screenshotted from a fixed viewport.
 *
 * Charts are generated SVG paths: the HTML pages loaded `chart.js` (latest,
 * unpinned) and Tailwind from CDNs and ran them on every render.
 */

import svg2png from "../functions/svg2png.js";
import {
	ellipsize,
	escape,
	image,
	measure,
	raw,
	text,
	uid
} from "../functions/svgKit.js";

export interface StatsRow {
	avatar?: Buffer | null;
	/** Shown instead of an avatar (e.g. "#" for a text channel). */
	icon?: string;
	name: string;
	detail?: string;
	value: string;
	unit?: string;
}

export interface StatsMetric {
	value: string;
	label: string;
}

export interface StatsSeries {
	name: string;
	color: string;
	values: number[];
}

interface SectionBlock {
	title: string;
	icon: string;
	accent?: string;
}

export type StatsBlock =
	| (SectionBlock & { type: "list"; rows: StatsRow[]; empty?: string })
	| (SectionBlock & {
			type: "metrics";
			items: StatsMetric[];
			columns?: number;
	  })
	| (SectionBlock & {
			type: "chart";
			labels: string[];
			series: StatsSeries[];
			height?: number;
	  })
	| { type: "columns"; blocks: StatsBlock[] };

export interface StatsPage {
	title: string;
	meta: string[];
	avatar: Buffer | null;
	blocks: StatsBlock[];
	footer: string;
	accent?: string;
	width?: number;
}

const COLORS = {
	primary: "#5865F2",
	secondary: "#EB459E",
	medium: "#2B2D31",
	light: "#313338",
	text: "#FFFFFF",
	normal: "#DCDDDE",
	muted: "#A3A6AA"
};
const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

const PAGE_PADDING = 40;
const BLOCK_GAP = 24;
const HEADER_HEIGHT = 140;
const SECTION_HEADER = 64;
const SECTION_PADDING = 20;

interface Laid {
	height: number;
	markup: string;
}

/* ------------------------------------------------------------------ */
/* Blocks                                                             */
/* ------------------------------------------------------------------ */

async function section(
	block: SectionBlock,
	x: number,
	y: number,
	width: number,
	body: (x: number, y: number, width: number) => Promise<Laid>
): Promise<Laid> {
	const accent = block.accent ?? COLORS.primary;
	const content = await body(
		x + SECTION_PADDING,
		y + SECTION_HEADER + SECTION_PADDING,
		width - SECTION_PADDING * 2
	);
	const height = SECTION_HEADER + SECTION_PADDING * 2 + content.height;
	const clip = uid("section");

	const [icon, title] = await Promise.all([
		text(block.icon, {
			x: x + 36,
			y: y + 39,
			size: 18,
			anchor: "middle"
		}),
		text(block.title, {
			x: x + 64,
			y: y + 39,
			size: 18,
			weight: 700,
			maxWidth: width - 84
		})
	]);

	return {
		height,
		markup: `<clipPath id="${clip}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8"/></clipPath>
<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="${COLORS.light}"/>
<g clip-path="url(#${clip})"><rect x="${x}" y="${y}" width="${width}" height="${SECTION_HEADER}" fill="#000000" opacity="0.15"/></g>
<rect x="${x}" y="${y + SECTION_HEADER}" width="${width}" height="1" fill="#ffffff" opacity="0.05"/>
<circle cx="${x + 36}" cy="${y + 32}" r="16" fill="${escape(accent)}" opacity="0.15"/>
${icon.markup}${title.markup}${content.markup}`
	};
}

async function listBody(
	rows: StatsRow[],
	empty: string | undefined,
	x: number,
	y: number,
	width: number
): Promise<Laid> {
	if (rows.length === 0) {
		const message = await text(empty ?? "-", {
			x: x + width / 2,
			y: y + 24,
			size: 14,
			fill: COLORS.muted,
			anchor: "middle"
		});
		return { height: 36, markup: message.markup };
	}

	const rowHeight = 64;
	const gap = 10;
	const parts = await Promise.all(
		rows.map(async (row, index) => {
			const top = y + index * (rowHeight + gap);
			const middle = top + rowHeight / 2;
			const unitStyle = { size: 13 };
			const valueStyle = { size: 18, weight: 700 as const };
			const unitWidth = row.unit ? await measure(row.unit, unitStyle) : 0;
			const valueRight = x + width - 16 - (row.unit ? unitWidth + 6 : 0);
			const valueWidth = await measure(row.value, valueStyle);
			const textX = x + 96;
			const textWidth = Math.max(
				40,
				valueRight - valueWidth - 20 - textX
			);

			const avatar = row.avatar
				? image(row.avatar, {
						x: x + 44,
						y: middle - 20,
						width: 40,
						height: 40,
						radius: "circle"
					}).markup
				: `<rect x="${x + 44}" y="${middle - 20}" width="40" height="40" rx="8" fill="${COLORS.primary}" opacity="0.15"/>${
						(
							await text(row.icon ?? "#", {
								x: x + 64,
								y: middle + 7,
								size: 18,
								weight: 700,
								anchor: "middle",
								fill: COLORS.normal
							})
						).markup
					}`;

			const [rank, name, detail, value, unit] = await Promise.all([
				text(String(index + 1), {
					x: x + 22,
					y: middle + 7,
					size: 20,
					weight: 700,
					anchor: "middle",
					fill: RANK_COLORS[index] ?? COLORS.muted
				}),
				text(row.name, {
					x: textX,
					y: row.detail ? middle - 4 : middle + 6,
					size: 16,
					weight: 700,
					maxWidth: textWidth
				}),
				row.detail
					? text(row.detail, {
							x: textX,
							y: middle + 16,
							size: 13,
							fill: COLORS.muted,
							maxWidth: textWidth
						})
					: Promise.resolve(raw("")),
				text(row.value, {
					...valueStyle,
					x: valueRight,
					y: middle + 6,
					anchor: "end"
				}),
				row.unit
					? text(row.unit, {
							...unitStyle,
							x: x + width - 16,
							y: middle + 6,
							anchor: "end",
							fill: COLORS.muted
						})
					: Promise.resolve(raw(""))
			]);

			return `<rect x="${x}" y="${top}" width="${width}" height="${rowHeight}" rx="8" fill="#ffffff" opacity="0.03"/>${rank.markup}${avatar}${name.markup}${detail.markup}${value.markup}${unit.markup}`;
		})
	);

	return {
		height: rows.length * rowHeight + (rows.length - 1) * gap,
		markup: parts.join("")
	};
}

async function metricsBody(
	items: StatsMetric[],
	requestedColumns: number | undefined,
	accent: string,
	x: number,
	y: number,
	width: number
): Promise<Laid> {
	const columns = Math.max(1, requestedColumns ?? Math.min(items.length, 3));
	const gap = 12;
	const cardWidth = (width - gap * (columns - 1)) / columns;
	const cardHeight = 92;
	const rowsCount = Math.ceil(items.length / columns);

	const cards = await Promise.all(
		items.map(async (item, index) => {
			const cx = x + (index % columns) * (cardWidth + gap);
			const cy = y + Math.floor(index / columns) * (cardHeight + gap);
			const [value, label] = await Promise.all([
				text(item.value, {
					x: cx + cardWidth / 2,
					y: cy + 46,
					size: 28,
					weight: 700,
					anchor: "middle",
					maxWidth: cardWidth - 24
				}),
				text(item.label, {
					x: cx + cardWidth / 2,
					y: cy + 72,
					size: 13,
					fill: COLORS.muted,
					anchor: "middle",
					maxWidth: cardWidth - 24
				})
			]);
			return `<rect x="${cx.toFixed(1)}" y="${cy}" width="${cardWidth.toFixed(1)}" height="${cardHeight}" rx="8" fill="#ffffff" opacity="0.03"/><rect x="${cx.toFixed(1)}" y="${cy}" width="3" height="${cardHeight}" rx="1.5" fill="${escape(accent)}"/>${value.markup}${label.markup}`;
		})
	);

	return {
		height: rowsCount * cardHeight + (rowsCount - 1) * gap,
		markup: cards.join("")
	};
}

/**
 * Axis maximum: four gridline steps, each a round number (1, 2, 2.5, 3, 4
 * or 5 x 10^n), as tight as possible above the data.
 */
function niceMax(value: number): number {
	if (value <= 0) return 4;
	const rawStep = value / 4;
	const magnitude = 10 ** Math.floor(Math.log10(rawStep));
	for (const step of [1, 2, 2.5, 3, 4, 5, 10]) {
		if (rawStep <= step * magnitude) return step * magnitude * 4;
	}
	return 40 * magnitude;
}

function formatTick(value: number): string {
	if (value >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)}M`;
	if (value >= 1_000) return `${+(value / 1_000).toFixed(1)}K`;
	return `${+value.toFixed(1)}`;
}

/** Smooth path through the points (Catmull-Rom converted to Bezier). */
function smoothPath(points: [number, number][]): string {
	if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
	let path = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[Math.max(0, i - 1)];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 = points[Math.min(points.length - 1, i + 2)];
		const tension = 0.4 / 3;
		const c1x = p1[0] + (p2[0] - p0[0]) * tension;
		const c1y = p1[1] + (p2[1] - p0[1]) * tension;
		const c2x = p2[0] - (p3[0] - p1[0]) * tension;
		const c2y = p2[1] - (p3[1] - p1[1]) * tension;
		path += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
	}
	return path;
}

async function chartBody(
	labels: string[],
	series: StatsSeries[],
	requestedHeight: number | undefined,
	x: number,
	y: number,
	width: number
): Promise<Laid> {
	const legendHeight = 28;
	const plotHeight = requestedHeight ?? 240;
	const axisWidth = 48;
	const labelsHeight = 24;
	const plotX = x + axisWidth;
	const plotY = y + legendHeight + 8;
	const plotWidth = width - axisWidth;
	const count = Math.max(
		labels.length,
		...series.map((entry) => entry.values.length)
	);
	const max = niceMax(
		Math.max(0, ...series.flatMap((entry) => entry.values))
	);
	const pointX = (index: number) =>
		plotX +
		(count <= 1 ? plotWidth / 2 : (plotWidth * index) / (count - 1));
	const pointY = (value: number) =>
		plotY + plotHeight - (Math.max(0, value) / max) * plotHeight;

	const elements: string[] = [];

	// Legend
	let legendX = x;
	for (const entry of series) {
		const label = await text(entry.name, {
			x: legendX + 18,
			y: y + 18,
			size: 13,
			fill: COLORS.normal
		});
		elements.push(
			`<circle cx="${legendX + 6}" cy="${y + 13}" r="6" fill="${escape(entry.color)}"/>`,
			label.markup
		);
		legendX += 18 + (await measure(entry.name, { size: 13 })) + 24;
	}

	// Gridlines and y ticks
	for (let i = 0; i <= 4; i++) {
		const value = (max * i) / 4;
		const lineY = pointY(value);
		elements.push(
			`<rect x="${plotX}" y="${lineY.toFixed(1)}" width="${plotWidth}" height="1" fill="#ffffff" opacity="${i === 0 ? 0.15 : 0.06}"/>`,
			(
				await text(formatTick(value), {
					x: plotX - 10,
					y: lineY + 4,
					size: 11,
					fill: COLORS.muted,
					anchor: "end"
				})
			).markup
		);
	}

	// X labels: at most 8, evenly spread
	const step = Math.max(1, Math.ceil(labels.length / 8));
	for (let i = 0; i < labels.length; i += step) {
		elements.push(
			(
				await text(labels[i], {
					x: pointX(i),
					y: plotY + plotHeight + 18,
					size: 11,
					fill: COLORS.muted,
					anchor: "middle",
					maxWidth: (plotWidth / Math.min(labels.length, 8)) * 0.95
				})
			).markup
		);
	}

	// Series: gradient area + smooth line
	for (const entry of series) {
		if (entry.values.length === 0) continue;
		const points = entry.values.map(
			(value, index) => [pointX(index), pointY(value)] as [number, number]
		);
		const line = smoothPath(points);
		const gradient = uid("area");
		const baseline = (plotY + plotHeight).toFixed(1);
		const color = escape(entry.color);
		elements.push(
			`<linearGradient id="${gradient}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.45"/><stop offset="1" stop-color="${color}" stop-opacity="0.03"/></linearGradient>`,
			`<path d="${line} L ${points[points.length - 1][0].toFixed(1)} ${baseline} L ${points[0][0].toFixed(1)} ${baseline} Z" fill="url(#${gradient})"/>`,
			`<path d="${line}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`
		);
	}

	return {
		height: legendHeight + 8 + plotHeight + labelsHeight,
		markup: elements.join("")
	};
}

async function layoutBlock(
	block: StatsBlock,
	x: number,
	y: number,
	width: number,
	accent: string
): Promise<Laid> {
	switch (block.type) {
		case "list":
			return section(
				{ ...block, accent: block.accent ?? accent },
				x,
				y,
				width,
				(bx, by, bw) => listBody(block.rows, block.empty, bx, by, bw)
			);
		case "metrics":
			return section(
				{ ...block, accent: block.accent ?? accent },
				x,
				y,
				width,
				(bx, by, bw) =>
					metricsBody(
						block.items,
						block.columns,
						block.accent ?? accent,
						bx,
						by,
						bw
					)
			);
		case "chart":
			return section(
				{ ...block, accent: block.accent ?? accent },
				x,
				y,
				width,
				(bx, by, bw) =>
					chartBody(
						block.labels,
						block.series,
						block.height,
						bx,
						by,
						bw
					)
			);
		case "columns": {
			const count = block.blocks.length;
			const columnWidth = (width - BLOCK_GAP * (count - 1)) / count;
			const laid = await Promise.all(
				block.blocks.map((child, index) =>
					layoutBlock(
						child,
						x + index * (columnWidth + BLOCK_GAP),
						y,
						columnWidth,
						accent
					)
				)
			);
			return {
				height: Math.max(0, ...laid.map((entry) => entry.height)),
				markup: laid.map((entry) => entry.markup).join("")
			};
		}
	}
}

/** Discord avatar / icon URL -> buffer (snapshot via image64), or null. */
export async function fetchAvatar(
	url: string | null | undefined
): Promise<Buffer | null> {
	if (!url) return null;
	return (await globalThis.client.func.image64.image64(url)) ?? null;
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export async function renderStatsPage(page: StatsPage): Promise<Buffer> {
	const width = page.width ?? 1000;
	const accent = page.accent ?? COLORS.primary;
	const contentWidth = width - PAGE_PADDING * 2;

	const blocks: string[] = [];
	let y = HEADER_HEIGHT + 32;
	for (const block of page.blocks) {
		const laid = await layoutBlock(
			block,
			PAGE_PADDING,
			y,
			contentWidth,
			accent
		);
		blocks.push(laid.markup);
		y += laid.height + BLOCK_GAP;
	}
	const footerY = y + 12;
	const height = footerY + 28;

	const textX = PAGE_PADDING + 104;
	const metaText = page.meta.join("  •  ");
	const [title, meta, footer] = await Promise.all([
		text(page.title, {
			x: textX,
			y: 72,
			size: 32,
			weight: 700,
			maxWidth: width - textX - PAGE_PADDING
		}),
		text(metaText, {
			x: textX,
			y: 104,
			size: 15,
			fill: COLORS.muted,
			maxWidth: width - textX - PAGE_PADDING
		}),
		text(page.footer, {
			x: width / 2,
			y: footerY,
			size: 13,
			fill: COLORS.muted,
			anchor: "middle",
			maxWidth: contentWidth
		})
	]);

	const avatar = page.avatar
		? image(page.avatar, {
				x: PAGE_PADDING,
				y: 30,
				width: 80,
				height: 80,
				radius: "circle"
			}).markup
		: `<circle cx="${PAGE_PADDING + 40}" cy="70" r="40" fill="${COLORS.light}"/>`;

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
<linearGradient id="page" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COLORS.medium}"/><stop offset="1" stop-color="${COLORS.light}"/></linearGradient>
<linearGradient id="band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${COLORS.primary}" stop-opacity="0.2"/><stop offset="1" stop-color="${COLORS.secondary}" stop-opacity="0.2"/></linearGradient>
<linearGradient id="bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${COLORS.primary}"/><stop offset="1" stop-color="${COLORS.secondary}"/></linearGradient>
<clipPath id="container"><rect width="${width}" height="${height}" rx="16"/></clipPath>
</defs>
<rect width="${width}" height="${height}" rx="16" fill="url(#page)"/>
<g clip-path="url(#container)">
<rect width="${width}" height="${HEADER_HEIGHT}" fill="url(#band)"/>
<rect width="${width}" height="4" fill="url(#bar)"/>
<rect y="${HEADER_HEIGHT}" width="${width}" height="1" fill="#ffffff" opacity="0.1"/>
</g>
${avatar}
<circle cx="${PAGE_PADDING + 40}" cy="70" r="42" fill="none" stroke="#ffffff" stroke-opacity="0.2" stroke-width="4"/>
${title.markup}${meta.markup}
${blocks.join("\n")}
${footer.markup}
</svg>`;

	return svg2png(svg, { scale: 2 });
}
