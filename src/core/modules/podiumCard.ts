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
 * Top-3 podium (ranks and economy leaderboards) rendered with resvg.
 * Classic layout: 2nd left, 1st centre (tallest), 3rd right.
 */

import svg2png from "../functions/svg2png.js";
import { escape, image, measure, raw, text } from "../functions/svgKit.js";

export interface PodiumEntry {
	name: string;
	subtitle?: string;
	avatar: Buffer | null;
	badge: string;
}

export interface PodiumOptions {
	title: string;
	/** Top three, best first. */
	entries: PodiumEntry[];
	/** Badge gradient. */
	badgeColors: [string, string];
	/** Small image drawn before the badge text (e.g. a coin emoji). */
	badgeIcon?: Buffer | null;
}

const CARD_WIDTH = 200;
const CARD_GAP = 30;
const PADDING = 32;
const TITLE_HEIGHT = 84;
const HEIGHTS = [300, 268, 244];
const RING_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
// Visual order: second, first, third.
const SLOTS = [1, 0, 2];

export async function renderPodium(options: PodiumOptions): Promise<Buffer> {
	const width = PADDING * 2 + CARD_WIDTH * 3 + CARD_GAP * 2;
	const base = TITLE_HEIGHT + HEIGHTS[0];
	const height = base + PADDING;

	const cards = await Promise.all(
		SLOTS.map(async (rank, column) => {
			const entry = options.entries[rank];
			if (!entry) return "";
			const cardHeight = HEIGHTS[rank];
			const x = PADDING + column * (CARD_WIDTH + CARD_GAP);
			const y = base - cardHeight;
			const center = x + CARD_WIDTH / 2;
			const clip = `card${rank}`;

			const badgeStyle = { size: 13, weight: 700 as const };
			const iconSize = options.badgeIcon ? 18 : 0;
			const badgeTextWidth = await measure(entry.badge, badgeStyle);
			const badgeWidth = Math.min(
				CARD_WIDTH - 24,
				badgeTextWidth + 30 + (iconSize ? iconSize + 6 : 0)
			);
			const badgeY = y + cardHeight - 20 - 30;
			const badgeX = center - badgeWidth / 2;
			const badgeTextX = badgeX + 15 + (iconSize ? iconSize + 6 : 0);

			const [name, subtitle, badge] = await Promise.all([
				text(entry.name, {
					x: center,
					y: y + 152,
					size: 19,
					weight: 700,
					anchor: "middle",
					maxWidth: CARD_WIDTH - 24
				}),
				entry.subtitle
					? text(entry.subtitle, {
							x: center,
							y: y + 176,
							size: 15,
							fill: "#b9bbbe",
							anchor: "middle",
							maxWidth: CARD_WIDTH - 24
						})
					: Promise.resolve(raw("")),
				text(entry.badge, {
					...badgeStyle,
					x: badgeTextX,
					y: badgeY + 20,
					maxWidth: badgeWidth - (badgeTextX - badgeX) - 12
				})
			]);

			const avatar = entry.avatar
				? image(entry.avatar, {
						x: center - 40,
						y: y + 32,
						width: 80,
						height: 80,
						radius: "circle"
					}).markup
				: `<circle cx="${center}" cy="${y + 72}" r="40" fill="#40444B"/>`;
			const icon = options.badgeIcon
				? image(options.badgeIcon, {
						x: badgeX + 13,
						y: badgeY + 6,
						width: iconSize,
						height: iconSize
					}).markup
				: "";

			return `<clipPath id="${clip}"><rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="${cardHeight}" rx="12"/></clipPath>
<rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="${cardHeight}" rx="12" fill="url(#card)" filter="url(#shadow)"/>
<g clip-path="url(#${clip})"><rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="5" fill="url(#bar)"/></g>
<text x="${x + 16}" y="${y + 34}" font-family="Noto Sans" font-size="16" font-weight="700" fill="${RING_COLORS[rank]}">#${rank + 1}</text>
${avatar}<circle cx="${center}" cy="${y + 72}" r="42" fill="none" stroke="${RING_COLORS[rank]}" stroke-width="4"/>
${name.markup}${subtitle.markup}
<rect x="${badgeX.toFixed(1)}" y="${badgeY}" width="${badgeWidth.toFixed(1)}" height="30" rx="12" fill="url(#badge)"/>
${icon}${badge.markup}`;
		})
	);

	const title = await text(options.title, {
		x: width / 2,
		y: 54,
		size: 28,
		weight: 700,
		anchor: "middle",
		maxWidth: width - PADDING * 2
	});

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
<linearGradient id="card" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2c2f33"/><stop offset="1" stop-color="#23272a"/></linearGradient>
<linearGradient id="bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fbbf24"/><stop offset="0.5" stop-color="#f97316"/><stop offset="1" stop-color="#ef4444"/></linearGradient>
<linearGradient id="badge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${escape(options.badgeColors[0])}"/><stop offset="1" stop-color="${escape(options.badgeColors[1])}"/></linearGradient>
<filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#000000" flood-opacity="0.4"/></filter>
</defs>
<rect width="${width}" height="${height}" rx="16" fill="#1e1f22"/>
${title.markup}
${cards.join("\n")}
</svg>`;

	return svg2png(svg, { scale: 2 });
}
