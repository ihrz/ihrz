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
 * Music images (now playing player card) rendered with resvg.
 * Track titles come from YouTube / SoundCloud / ...: anyone can publish one,
 * so they are only ever inserted as escaped text. Artwork is downloaded
 * once through the public-only fetcher and reused for refreshes.
 */

import svg2png from "../functions/svg2png.js";
import { fetchImage, fill, image, raw, text } from "../functions/svgKit.js";

const CARD_WIDTH = 640;
const CARD_PADDING = 24;
const TEXT_X = 204;
const TEXT_WIDTH = CARD_WIDTH - CARD_PADDING - TEXT_X;
const PROGRESS_Y = 144;
const PROGRESS_HEIGHT = 6;

export interface NowPlayingData {
	title: string;
	author: string;
	artwork: Buffer | null;
	colorStart: string;
	colorEnd: string;
	/** 0..1 */
	progress: number;
	currentTime: string;
	totalTime: string;
	paused: boolean;
	/** Set for streams: replaces the progress bar. */
	liveLabel?: string;
}

// YouTube "hqdefault" thumbnails are 4:3 with black bars around a 16:9
// frame; maxresdefault / mqdefault are the same frame without the bars.
const YOUTUBE_THUMBNAIL =
	/^https:\/\/i\.ytimg\.com\/vi(?:_webp)?\/([\w-]{6,20})\/(?:hq|sd)default\.\w+/;

export async function loadArtwork(url?: string | null): Promise<Buffer | null> {
	if (!url) return null;
	const youtube = url.match(YOUTUBE_THUMBNAIL);
	if (youtube) {
		for (const variant of ["maxresdefault", "mqdefault"]) {
			const artwork = await fetchImage(
				`https://i.ytimg.com/vi/${youtube[1]}/${variant}.jpg`
			);
			if (artwork) return artwork;
		}
	}
	return fetchImage(url);
}

/** Compact player card (640x200) shown in the /nowplaying panel. */
export async function renderNowPlaying(data: NowPlayingData): Promise<Buffer> {
	const muted = "#ffffff";
	const [title, artist] = await Promise.all([
		text(data.title, {
			x: TEXT_X,
			y: 76,
			size: 26,
			weight: 700,
			maxWidth: TEXT_WIDTH - (data.paused ? 32 : 0)
		}),
		text(data.author, {
			x: TEXT_X,
			y: 108,
			size: 18,
			fill: muted,
			opacity: 0.72,
			maxWidth: TEXT_WIDTH
		})
	]);

	let progress = raw("");
	let currentTime = raw("");
	let totalTime = raw("");
	let status = raw("");

	if (data.paused) {
		const x = CARD_WIDTH - CARD_PADDING - 18;
		status = raw(
			`<g fill="#ffffff" opacity="0.85"><rect x="${x}" y="54" width="6" height="22" rx="2"/><rect x="${x + 12}" y="54" width="6" height="22" rx="2"/></g>`
		);
	}

	if (data.liveLabel) {
		const label = await text(data.liveLabel.toUpperCase(), {
			x: TEXT_X + 18,
			y: PROGRESS_Y + 8,
			size: 14,
			weight: 700,
			letterSpacing: 1.5
		});
		progress = raw(
			`<circle cx="${TEXT_X + 5}" cy="${PROGRESS_Y + 3}" r="5" fill="#ff4d4f"/>${label.markup}`
		);
	} else {
		const ratio = Math.max(0, Math.min(1, data.progress || 0));
		const filled = TEXT_WIDTH * ratio;
		const knobX = TEXT_X + filled;
		const fillOpacity = data.paused ? 0.55 : 1;
		progress = raw(
			`<rect x="${TEXT_X}" y="${PROGRESS_Y}" width="${TEXT_WIDTH}" height="${PROGRESS_HEIGHT}" rx="3" fill="#ffffff" opacity="0.22"/>` +
				`<rect x="${TEXT_X}" y="${PROGRESS_Y}" width="${filled.toFixed(1)}" height="${PROGRESS_HEIGHT}" rx="3" fill="#ffffff" opacity="${fillOpacity}"/>` +
				`<circle cx="${knobX.toFixed(1)}" cy="${PROGRESS_Y + PROGRESS_HEIGHT / 2}" r="8" fill="#ffffff" opacity="${fillOpacity}"/>`
		);
		[currentTime, totalTime] = await Promise.all([
			text(data.currentTime, {
				x: TEXT_X,
				y: 178,
				size: 13,
				family: "JetBrains Mono",
				fill: muted,
				opacity: 0.72
			}),
			text(data.totalTime, {
				x: CARD_WIDTH - CARD_PADDING,
				y: 178,
				size: 13,
				family: "JetBrains Mono",
				fill: muted,
				opacity: 0.72,
				anchor: "end"
			})
		]);
	}

	const svg = fill(globalThis.client.svgfiles["nowPlaying"], {
		color_start: data.colorStart,
		color_end: data.colorEnd,
		backdrop: data.artwork
			? image(data.artwork, {
					x: -40,
					y: -40,
					width: CARD_WIDTH + 80,
					height: 280
				})
			: raw(""),
		cover: data.artwork
			? image(data.artwork, {
					x: CARD_PADDING,
					y: CARD_PADDING,
					width: 152,
					height: 152,
					radius: 14
				})
			: raw(""),
		title,
		artist,
		status,
		progress,
		current_time: currentTime,
		total_time: totalTime
	});

	return svg2png(svg, { scale: 2 });
}
