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

// The /stats images, drawn as SVG and rendered by resvg. One visual system
// for every view: an ink page, thin rules instead of boxes, messages always
// in blue and voice always in coral (a colour-blind-safe pair), big Anton
// figures, a daily chart, the weekday × hour heatmap and ranked bars.

import svg2png from "../functions/svg2png.js";
import { escape, image, measure, text, uid } from "../functions/svgKit.js";
import type { Heatmap } from "./statsAnalytics.js";

export const PALETTE = {
	bg: "#12131A",
	surface: "#1A1C26",
	rule: "#272A38",
	text: "#F3F4F8",
	muted: "#9AA0B2",
	faint: "#5F6578",
	messages: "#6C8BFF",
	voice: "#FF8A5B",
	up: "#4ADE80",
	down: "#F87171"
} as const;

const W = 1080;
const P = 56;
const CONTENT = W - 2 * P;
const GAP = 44;

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

type Part = string;

async function t(
	content: string,
	x: number,
	y: number,
	size: number,
	opts: {
		fill?: string;
		weight?: 400 | 700;
		family?: "Noto Sans" | "Anton";
		anchor?: "start" | "middle" | "end";
		maxWidth?: number;
		opacity?: number;
	} = {}
): Promise<Part> {
	return (
		await text(content, {
			x,
			y,
			size,
			fill: opts.fill ?? PALETTE.text,
			weight: opts.weight ?? 400,
			family: opts.family ?? "Noto Sans",
			anchor: opts.anchor ?? "start",
			maxWidth: opts.maxWidth,
			opacity: opts.opacity
		})
	).markup;
}

function rect(
	x: number,
	y: number,
	w: number,
	h: number,
	fill: string,
	r = 0,
	extra = ""
): Part {
	return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0, w).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="${r}" fill="${fill}" ${extra}/>`;
}

function rule(y: number): Part {
	return rect(P, y, CONTENT, 1, PALETTE.rule);
}

/** Mixes a colour toward the background: 0 = bg, 1 = colour. */
function mix(hex: string, amount: number): string {
	const a = parseInt(PALETTE.bg.slice(1), 16);
	const b = parseInt(hex.slice(1), 16);
	const ch = (shift: number) => {
		const x = (a >> shift) & 255;
		const y = (b >> shift) & 255;
		return Math.round(x + (y - x) * amount);
	};
	return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

/**
 * Smooth path through points (Catmull-Rom as cubic Béziers). Control points
 * are clamped between `minY` and `maxY`, so a curve never dips below the
 * baseline between two zero days.
 */
function smoothPath(
	pts: readonly (readonly [number, number])[],
	minY: number,
	maxY: number
): string {
	if (pts.length < 2) return "";
	const clamp = (v: number) => Math.min(maxY, Math.max(minY, v));
	let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[i - 1] ?? pts[i];
		const p1 = pts[i];
		const p2 = pts[i + 1];
		const p3 = pts[i + 2] ?? p2;
		const c1x = p1[0] + (p2[0] - p0[0]) / 6;
		const c1y = clamp(p1[1] + (p2[1] - p0[1]) / 6);
		const c2x = p2[0] - (p3[0] - p1[0]) / 6;
		const c2y = clamp(p2[1] - (p3[1] - p1[1]) / 6);
		d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
	}
	return d;
}

/** A small rounded square in a series colour, before section titles. */
function swatch(x: number, y: number, color: string): Part {
	return rect(x, y - 13, 12, 12, color, 3);
}

/** Speaker glyph for voice channels. */
function speaker(x: number, y: number, color: string): Part {
	return `<g transform="translate(${x} ${y - 15}) scale(0.9)" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h4l5-4v14l-5-4H3z" fill="${color}" stroke="none"/><path d="M15.5 6.5a5 5 0 0 1 0 7"/><path d="M18.5 3.8a9 9 0 0 1 0 12.4"/></g>`;
}

async function avatar(
	buffer: Buffer | null,
	name: string,
	x: number,
	y: number,
	size: number,
	color: string
): Promise<Part> {
	if (buffer) {
		return (
			image(buffer, { x, y, width: size, height: size, radius: "circle" })
				.markup +
			`<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2 - 1}" fill="none" stroke="${PALETTE.rule}" stroke-width="2"/>`
		);
	}
	const initial = [...(name.trim() || "?")][0].toUpperCase();
	return (
		`<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="${mix(color, 0.35)}"/>` +
		(await t(initial, x + size / 2, y + size * 0.66, size * 0.46, {
			weight: 700,
			anchor: "middle"
		}))
	);
}

function doc(height: number, body: Part[]): string {
	const glow = uid("glow");
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}">
<defs><radialGradient id="${glow}" cx="0.12" cy="0" r="0.9"><stop offset="0" stop-color="${PALETTE.messages}" stop-opacity="0.16"/><stop offset="1" stop-color="${PALETTE.messages}" stop-opacity="0"/></radialGradient></defs>
<rect width="${W}" height="${height}" fill="${PALETTE.bg}"/>
<rect width="${W}" height="${Math.min(height, 520)}" fill="url(#${glow})"/>
${body.join("\n")}
</svg>`;
}

async function png(height: number, body: Part[]): Promise<Buffer> {
	return svg2png(doc(height, body), { scale: 2 });
}

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

export interface Header {
	title: string;
	subtitle: string;
	avatar: Buffer | null;
	color?: string;
}

/** Avatar, title and subtitle; returns [parts, next y]. */
async function header(h: Header, y: number): Promise<[Part[], number]> {
	const size = 84;
	const parts = [
		await avatar(
			h.avatar,
			h.title,
			P,
			y,
			size,
			h.color ?? PALETTE.messages
		),
		await t(h.title, P + size + 24, y + 42, 36, {
			weight: 700,
			maxWidth: CONTENT - size - 24
		}),
		await t(h.subtitle, P + size + 24, y + 74, 19, {
			fill: PALETTE.muted,
			maxWidth: CONTENT - size - 24
		})
	];
	return [parts, y + size + 40];
}

export interface Figure {
	label: string;
	value: string;
	color?: string;
	/** Small line under the value; `tone` colours it. */
	note?: string;
	tone?: "up" | "down" | "muted";
}

/** A row of big figures separated by thin vertical rules. */
async function figures(items: Figure[], y: number): Promise<[Part[], number]> {
	const parts: Part[] = [rule(y)];
	const w = CONTENT / items.length;
	for (const [i, f] of items.entries()) {
		const x = P + i * w + (i ? 28 : 0);
		const inner = w - (i ? 28 : 0) - 12;
		if (i) parts.push(rect(P + i * w, y + 28, 1, 120, PALETTE.rule));
		parts.push(
			await t(f.label, x, y + 52, 18, {
				fill: PALETTE.muted,
				maxWidth: inner
			}),
			await t(f.value, x, y + 122, 62, {
				family: "Anton",
				fill: f.color ?? PALETTE.text,
				maxWidth: inner
			})
		);
		if (f.note) {
			parts.push(
				await t(f.note, x, y + 154, 16, {
					fill:
						f.tone === "up"
							? PALETTE.up
							: f.tone === "down"
								? PALETTE.down
								: PALETTE.faint,
					maxWidth: inner
				})
			);
		}
	}
	return [parts, y + 180];
}

async function sectionTitle(
	title: string,
	y: number,
	color: string,
	x = P,
	right?: string,
	rightX = P + CONTENT
): Promise<Part[]> {
	const parts = [
		swatch(x, y, color),
		await t(title, x + 22, y, 21, { weight: 700 })
	];
	if (right) {
		parts.push(
			await t(right, rightX, y, 17, {
				fill: PALETTE.muted,
				anchor: "end",
				weight: 700
			})
		);
	}
	return parts;
}

export interface DailySeries {
	/** Local day numbers (days since epoch), oldest first. */
	days: number[];
	messages: number[];
	voiceMinutes: number[];
}

/** Bars for messages, a line for voice minutes, weekends shaded. */
async function dailyChart(
	d: DailySeries,
	labels: { messages: string; voice: string; title: string },
	locale: string,
	y: number
): Promise<[Part[], number]> {
	const parts: Part[] = [
		...(await sectionTitle(labels.title, y, PALETTE.messages))
	];
	// Legend on the right: [line] Voice, then [square] Messages before it.
	const legendY = y;
	const style = {
		size: 16,
		family: "Noto Sans" as const,
		weight: 400 as const
	};
	const voiceW = await measure(labels.voice, style);
	const messagesW = await measure(labels.messages, style);
	const voiceX = P + CONTENT - voiceW;
	const messagesX = voiceX - 26 - 28 - messagesW;
	parts.push(
		rect(voiceX - 26, legendY - 7, 18, 3, PALETTE.voice, 1.5),
		await t(labels.voice, voiceX, legendY, 16, { fill: PALETTE.muted }),
		rect(messagesX - 20, legendY - 12, 12, 12, PALETTE.messages, 2),
		await t(labels.messages, messagesX, legendY, 16, {
			fill: PALETTE.muted
		})
	);

	const top = y + 30;
	const h = 210;
	const n = d.days.length;
	const slot = CONTENT / n;
	const barW = Math.max(4, slot * 0.62);
	const maxM = Math.max(1, ...d.messages);
	const maxV = Math.max(1, ...d.voiceMinutes);

	// Weekends and gridlines first, behind the data.
	for (let i = 0; i < n; i++) {
		const weekday = (new Date(d.days[i] * 86_400_000).getUTCDay() + 6) % 7;
		if (weekday >= 5) {
			parts.push(rect(P + i * slot, top, slot, h, PALETTE.surface));
		}
	}
	for (const f of [0.5, 1]) {
		parts.push(rect(P, top + h - h * f, CONTENT, 1, PALETTE.rule));
	}
	parts.push(rect(P, top + h, CONTENT, 1, PALETTE.faint));

	for (let i = 0; i < n; i++) {
		const v = d.messages[i];
		if (!v) continue;
		const bh = Math.max(3, (v / maxM) * (h - 8));
		parts.push(
			rect(
				P + i * slot + (slot - barW) / 2,
				top + h - bh,
				barW,
				bh,
				i === n - 1 ? PALETTE.messages : mix(PALETTE.messages, 0.78),
				Math.min(4, barW / 2)
			)
		);
	}
	if (d.voiceMinutes.some((v) => v > 0)) {
		const pts = d.voiceMinutes.map(
			(v, i) =>
				[
					P + i * slot + slot / 2,
					top + h - (v / maxV) * (h - 8)
				] as const
		);
		const path = smoothPath(pts, top + 2, top + h);
		parts.push(
			`<path d="${path}" fill="none" stroke="${PALETTE.bg}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" stroke-opacity="0.7"/>`,
			`<path d="${path}" fill="none" stroke="${PALETTE.voice}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`
		);
		const [lx, ly] = pts.at(-1)!;
		parts.push(
			`<circle cx="${lx}" cy="${ly}" r="5" fill="${PALETTE.voice}" stroke="${PALETTE.bg}" stroke-width="2"/>`
		);
	}
	// Scale hints: the top of each series.
	parts.push(
		await t(`${maxM}`, P, top - 8, 13, { fill: PALETTE.messages }),
		await t(`${maxV} min`, P + CONTENT, top - 8, 13, {
			fill: PALETTE.voice,
			anchor: "end"
		})
	);

	const fmt = new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
		timeZone: "UTC"
	});
	for (let i = n - 1; i >= 0; i -= 7) {
		parts.push(
			await t(
				fmt.format(new Date(d.days[i] * 86_400_000)),
				P + i * slot + slot / 2,
				top + h + 28,
				15,
				{ fill: PALETTE.muted, anchor: "middle" }
			)
		);
	}
	return [parts, top + h + 48];
}

export interface HeatBlock {
	title: string;
	heat: Heatmap;
	color: string;
	/** "Peak: Tuesday 21:00"-style annotation, or null. */
	note: string | null;
	peak: { weekday: number; hour: number } | null;
}

/** 7 × 24 heatmap, Monday first, peak outlined. */
async function heatmap(
	b: HeatBlock,
	weekdays: string[],
	y: number
): Promise<[Part[], number]> {
	const parts: Part[] = [
		...(await sectionTitle(b.title, y, b.color, P, b.note ?? undefined))
	];
	const labelW = 64;
	const top = y + 26;
	const gap = 4;
	const cell = (CONTENT - labelW - 23 * gap) / 24;
	const ch = 30;
	const max = Math.max(1, ...b.heat.flat());
	for (let d = 0; d < 7; d++) {
		const yy = top + d * (ch + gap);
		parts.push(
			await t(weekdays[d], P, yy + ch * 0.68, 15, {
				fill: PALETTE.muted,
				maxWidth: labelW - 8
			})
		);
		for (let h = 0; h < 24; h++) {
			const v = b.heat[d][h];
			// A square root keeps quiet hours visible next to a busy peak.
			const k = v > 0 ? 0.16 + 0.84 * Math.sqrt(v / max) : 0;
			const x = P + labelW + h * (cell + gap);
			parts.push(
				rect(x, yy, cell, ch, k ? mix(b.color, k) : PALETTE.surface, 5)
			);
			if (b.peak && b.peak.weekday === d && b.peak.hour === h) {
				parts.push(
					rect(
						x - 2,
						yy - 2,
						cell + 4,
						ch + 4,
						"none",
						7,
						`stroke="${PALETTE.text}" stroke-width="2.5"`
					)
				);
			}
		}
	}
	const bottom = top + 7 * (ch + gap);
	for (let h = 0; h < 24; h += 3) {
		parts.push(
			await t(
				`${String(h).padStart(2, "0")}:00`,
				P + labelW + h * (cell + gap),
				bottom + 20,
				14,
				{
					fill: PALETTE.faint
				}
			)
		);
	}
	return [parts, bottom + 40];
}

export interface BarRow {
	name: string;
	value: number;
	display: string;
	/** "text" or "voice" draw a channel glyph; a buffer draws an avatar. */
	icon?: "text" | "voice";
	avatar?: Buffer | null;
	/** Shown dimmer on the right of the name (a share, a tag…). */
	detail?: string;
}

/** Ranked rows with proportional bars, in a column of width `w`. */
async function bars(
	title: string,
	rows: BarRow[],
	color: string,
	x: number,
	w: number,
	y: number,
	empty: string,
	ranked = false
): Promise<[Part[], number]> {
	const parts = await sectionTitle(title, y, color, x);
	let yy = y + 26;
	if (rows.length === 0) {
		parts.push(await t(empty, x, yy + 26, 17, { fill: PALETTE.faint }));
		return [parts, yy + 50];
	}
	const max = Math.max(1, ...rows.map((r) => r.value));
	for (const [i, r] of rows.entries()) {
		let nameX = x;
		if (ranked) {
			parts.push(
				await t(String(i + 1), x + 14, yy + 30, 22, {
					family: "Anton",
					fill: i < 3 ? color : PALETTE.faint,
					anchor: "middle"
				})
			);
			nameX += 38;
		}
		if (r.avatar !== undefined) {
			parts.push(
				await avatar(r.avatar, r.name, nameX, yy + 6, 34, color)
			);
			nameX += 46;
		} else if (r.icon === "voice") {
			parts.push(speaker(nameX, yy + 30, PALETTE.faint));
			nameX += 30;
		} else if (r.icon === "text") {
			parts.push(
				await t("#", nameX + 4, yy + 29, 20, {
					fill: PALETTE.faint,
					weight: 700
				})
			);
			nameX += 30;
		}
		const valueW = 110;
		parts.push(
			await t(r.display, x + w, yy + 28, 18, {
				weight: 700,
				anchor: "end"
			}),
			await t(r.name, nameX, yy + 28, 18, {
				maxWidth: x + w - valueW - nameX - (r.detail ? 70 : 0)
			})
		);
		if (r.detail) {
			parts.push(
				await t(r.detail, x + w - valueW + 4, yy + 28, 15, {
					fill: PALETTE.faint,
					anchor: "end"
				})
			);
		}
		const trackY = yy + 40;
		parts.push(
			rect(nameX, trackY, x + w - nameX, 5, PALETTE.surface, 2.5),
			rect(
				nameX,
				trackY,
				Math.max(5, ((x + w - nameX) * r.value) / max),
				5,
				i === 0 ? color : mix(color, 0.7),
				2.5
			)
		);
		yy += 56;
	}
	return [parts, yy + 6];
}

async function footer(
	left: string,
	right: string,
	y: number
): Promise<[Part[], number]> {
	return [
		[
			rule(y),
			await t(left, P, y + 34, 15, { fill: PALETTE.faint, weight: 700 }),
			await t(right, P + CONTENT, y + 34, 15, {
				fill: PALETTE.faint,
				anchor: "end"
			})
		],
		y + 56
	];
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

export interface PageBase {
	header: Header;
	locale: string;
	/** Bot name (signature) and the time zone note. */
	footerLeft: string;
	footerRight: string;
}

export interface OverviewPage extends PageBase {
	figures: Figure[];
	daily: DailySeries;
	dailyLabels: { title: string; messages: string; voice: string };
	left: { title: string; rows: BarRow[]; color: string; ranked?: boolean };
	right: { title: string; rows: BarRow[]; color: string; ranked?: boolean };
	empty: string;
}

export async function renderOverview(p: OverviewPage): Promise<Buffer> {
	const body: Part[] = [];
	let y = 48;
	let parts: Part[];
	[parts, y] = await header(p.header, y);
	body.push(...parts);
	[parts, y] = await figures(p.figures, y);
	body.push(...parts);
	[parts, y] = await dailyChart(p.daily, p.dailyLabels, p.locale, y + 36);
	body.push(...parts);
	const colW = (CONTENT - GAP) / 2;
	const [l, ly] = await bars(
		p.left.title,
		p.left.rows,
		p.left.color,
		P,
		colW,
		y + 30,
		p.empty,
		p.left.ranked
	);
	const [r, ry] = await bars(
		p.right.title,
		p.right.rows,
		p.right.color,
		P + colW + GAP,
		colW,
		y + 30,
		p.empty,
		p.right.ranked
	);
	body.push(...l, ...r);
	[parts, y] = await footer(
		p.footerLeft,
		p.footerRight,
		Math.max(ly, ry) + 16
	);
	body.push(...parts);
	return png(y, body);
}

export interface RhythmPage extends PageBase {
	weekdays: string[];
	blocks: HeatBlock[];
	figures?: Figure[];
}

export async function renderRhythm(p: RhythmPage): Promise<Buffer> {
	const body: Part[] = [];
	let y = 48;
	let parts: Part[];
	[parts, y] = await header(p.header, y);
	body.push(...parts);
	if (p.figures?.length) {
		[parts, y] = await figures(p.figures, y);
		body.push(...parts);
		y += 20;
	}
	for (const b of p.blocks) {
		[parts, y] = await heatmap(b, p.weekdays, y + 16);
		body.push(...parts);
	}
	[parts, y] = await footer(p.footerLeft, p.footerRight, y + 8);
	body.push(...parts);
	return png(y, body);
}

export interface RankingPage extends PageBase {
	title: string;
	rows: BarRow[];
	color: string;
	empty: string;
	/** A second column (e.g. voice channels next to text channels). */
	right?: { title: string; rows: BarRow[]; color: string };
}

export async function renderRanking(p: RankingPage): Promise<Buffer> {
	const body: Part[] = [];
	let y = 48;
	let parts: Part[];
	[parts, y] = await header(p.header, y);
	body.push(...parts, rule(y));
	if (p.right) {
		const colW = (CONTENT - GAP) / 2;
		const [l, ly] = await bars(
			p.title,
			p.rows,
			p.color,
			P,
			colW,
			y + 44,
			p.empty,
			true
		);
		const [r, ry] = await bars(
			p.right.title,
			p.right.rows,
			p.right.color,
			P + colW + GAP,
			colW,
			y + 44,
			p.empty,
			true
		);
		body.push(...l, ...r);
		y = Math.max(ly, ry);
	} else {
		[parts, y] = await bars(
			p.title,
			p.rows,
			p.color,
			P,
			CONTENT,
			y + 44,
			p.empty,
			true
		);
		body.push(...parts);
	}
	[parts, y] = await footer(p.footerLeft, p.footerRight, y + 16);
	body.push(...parts);
	return png(y, body);
}

export interface Side {
	name: string;
	avatar: Buffer | null;
	color: string;
}

export interface CompareRow {
	label: string;
	a: number;
	b: number;
	aText: string;
	bText: string;
}

export interface ComparePage extends Omit<PageBase, "header"> {
	a: Side;
	b: Side;
	rows: CompareRow[];
	daily: { days: number[]; a: number[]; b: number[]; title: string };
}

/** Two members face to face: mirrored bars per metric, then both curves. */
export async function renderCompare(p: ComparePage): Promise<Buffer> {
	const body: Part[] = [];
	let y = 48;
	const mid = P + CONTENT / 2;
	const size = 92;
	body.push(
		await avatar(p.a.avatar, p.a.name, P, y, size, p.a.color),
		await t(p.a.name, P + size + 20, y + 58, 30, {
			weight: 700,
			maxWidth: CONTENT / 2 - size - 60,
			fill: p.a.color
		}),
		await avatar(
			p.b.avatar,
			p.b.name,
			P + CONTENT - size,
			y,
			size,
			p.b.color
		),
		await t(p.b.name, P + CONTENT - size - 20, y + 58, 30, {
			weight: 700,
			maxWidth: CONTENT / 2 - size - 60,
			fill: p.b.color,
			anchor: "end"
		}),
		await t("vs", mid, y + 60, 34, {
			family: "Anton",
			fill: PALETTE.faint,
			anchor: "middle"
		})
	);
	y += size + 36;
	body.push(rule(y));
	y += 20;
	const half = CONTENT / 2 - 110;
	for (const r of p.rows) {
		const max = Math.max(1, r.a, r.b);
		const aw = (r.a / max) * half;
		const bw = (r.b / max) * half;
		const win = r.a === r.b ? 0 : r.a > r.b ? -1 : 1;
		body.push(
			await t(r.label, mid, y + 26, 16, {
				fill: PALETTE.muted,
				anchor: "middle"
			}),
			await t(r.aText, P, y + 26, 22, {
				weight: 700,
				fill: win === -1 ? PALETTE.text : PALETTE.muted
			}),
			await t(r.bText, P + CONTENT, y + 26, 22, {
				weight: 700,
				anchor: "end",
				fill: win === 1 ? PALETTE.text : PALETTE.muted
			}),
			rect(mid - 100 - half, y + 40, half, 8, PALETTE.surface, 4),
			rect(
				mid - 100 - aw,
				y + 40,
				Math.max(aw, r.a ? 6 : 0),
				8,
				win === -1 ? p.a.color : mix(p.a.color, 0.55),
				4
			),
			rect(mid + 100, y + 40, half, 8, PALETTE.surface, 4),
			rect(
				mid + 100,
				y + 40,
				Math.max(bw, r.b ? 6 : 0),
				8,
				win === 1 ? p.b.color : mix(p.b.color, 0.55),
				4
			)
		);
		y += 66;
	}
	y += 20;
	// Both members' daily messages.
	body.push(...(await sectionTitle(p.daily.title, y, PALETTE.muted)));
	const top = y + 26;
	const h = 170;
	const n = p.daily.days.length;
	const slot = CONTENT / n;
	const max = Math.max(1, ...p.daily.a, ...p.daily.b);
	body.push(
		rect(P, top + h, CONTENT, 1, PALETTE.faint),
		rect(P, top + h / 2, CONTENT, 1, PALETTE.rule)
	);
	for (const [values, color] of [
		[p.daily.a, p.a.color],
		[p.daily.b, p.b.color]
	] as const) {
		const path = smoothPath(
			values.map(
				(v, i) =>
					[
						P + i * slot + slot / 2,
						top + h - (v / max) * (h - 8)
					] as const
			),
			top + 2,
			top + h
		);
		body.push(
			`<path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`
		);
	}
	const fmt = new Intl.DateTimeFormat(p.locale, {
		day: "numeric",
		month: "short",
		timeZone: "UTC"
	});
	for (let i = n - 1; i >= 0; i -= 7) {
		body.push(
			await t(
				fmt.format(new Date(p.daily.days[i] * 86_400_000)),
				P + i * slot + slot / 2,
				top + h + 26,
				15,
				{ fill: PALETTE.muted, anchor: "middle" }
			)
		);
	}
	y = top + h + 50;
	let parts: Part[];
	[parts, y] = await footer(p.footerLeft, p.footerRight, y);
	body.push(...parts);
	return png(y, body);
}

/** Weekday names Monday first, in a locale. */
export function weekdayNames(
	locale: string,
	style: "short" | "long" = "short"
): string[] {
	const fmt = new Intl.DateTimeFormat(locale, {
		weekday: style,
		timeZone: "UTC"
	});
	// 2024-01-01 was a Monday.
	return Array.from({ length: 7 }, (_, i) =>
		fmt.format(new Date(Date.UTC(2024, 0, 1 + i)))
	);
}

export { escape };
