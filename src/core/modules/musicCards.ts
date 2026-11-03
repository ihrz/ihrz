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
 * Music images (now playing card, track banner) rendered with resvg.
 * Track titles come from YouTube / SoundCloud / ...: anyone can publish one,
 * so they are only ever inserted as escaped text. Artwork is downloaded
 * once through the public-only fetcher and reused for refreshes.
 */

import svg2png from "../functions/svg2png.js";
import {
	fetchImage,
	fill,
	image,
	imageSize,
	paragraph,
	raw,
	text,
	wrap
} from "../functions/svgKit.js";

const CARD_WIDTH = 400;
const CARD_PADDING = 32;
const CONTENT_WIDTH = CARD_WIDTH - CARD_PADDING * 2;
const TITLE_SIZE = 24;
const TITLE_LINE_HEIGHT = 30;
const TITLE_MAX_LINES = 2;

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
}

export interface MusicBannerData {
	title: string;
	author: string;
	artwork: Buffer | null;
}

export function loadArtwork(url?: string | null): Promise<Buffer | null> {
	return url ? fetchImage(url) : Promise.resolve(null);
}

export async function renderNowPlaying(data: NowPlayingData): Promise<Buffer> {
	const size = data.artwork ? imageSize(data.artwork) : null;
	const coverHeight = data.artwork
		? Math.min(
				CONTENT_WIDTH,
				size
					? Math.round((CONTENT_WIDTH * size.height) / size.width)
					: CONTENT_WIDTH
			)
		: 0;
	const coverBottom = CARD_PADDING + coverHeight + (coverHeight ? 24 : 0);

	const titleStyle = { size: TITLE_SIZE, weight: 700 as const };
	const titleLines = (
		await wrap(data.title, CONTENT_WIDTH, titleStyle, TITLE_MAX_LINES)
	).length;
	const titleY = coverBottom + TITLE_SIZE;
	const artistY = titleY + (titleLines - 1) * TITLE_LINE_HEIGHT + 8 + 18;
	const progressY = artistY + 24;
	const timesY = progressY + 5 + 22;
	const height = timesY + CARD_PADDING - 4;

	const center = CARD_WIDTH / 2;
	const [title, artist, currentTime, totalTime] = await Promise.all([
		paragraph(data.title, {
			...titleStyle,
			x: center,
			y: titleY,
			anchor: "middle",
			maxWidth: CONTENT_WIDTH,
			lineHeight: TITLE_LINE_HEIGHT,
			maxLines: TITLE_MAX_LINES
		}),
		text(data.author, {
			x: center,
			y: artistY,
			size: 18,
			fill: "#e3e3e3",
			anchor: "middle",
			maxWidth: CONTENT_WIDTH
		}),
		text(data.currentTime, {
			x: CARD_PADDING,
			y: timesY,
			size: 14,
			fill: "#e3e3e3"
		}),
		text(data.totalTime, {
			x: CARD_WIDTH - CARD_PADDING,
			y: timesY,
			size: 14,
			fill: "#e3e3e3",
			anchor: "end"
		})
	]);

	const progress = Math.max(0, Math.min(1, data.progress || 0));
	const svg = fill(globalThis.client.svgfiles["nowPlaying"], {
		height,
		color_start: data.colorStart,
		color_end: data.colorEnd,
		cover: data.artwork
			? image(data.artwork, {
					x: CARD_PADDING,
					y: CARD_PADDING,
					width: CONTENT_WIDTH,
					height: coverHeight,
					radius: 10
				})
			: raw(""),
		title,
		artist,
		progress_y: progressY,
		progress_width: (CONTENT_WIDTH * progress).toFixed(1),
		current_time: currentTime,
		total_time: totalTime
	});

	return svg2png(svg, { scale: 2 });
}

export async function renderMusicBanner(
	data: MusicBannerData
): Promise<Buffer> {
	const textX = 16 + 80 + 16;
	const textWidth = 432 - textX - 16;
	const [title, artist] = await Promise.all([
		text(data.title, {
			x: textX,
			y: 50,
			size: 16,
			weight: 700,
			maxWidth: textWidth
		}),
		text(data.author, {
			x: textX,
			y: 74,
			size: 14,
			fill: "#b9bbbe",
			maxWidth: textWidth
		})
	]);

	const svg = fill(globalThis.client.svgfiles["musicBanner"], {
		cover: data.artwork
			? image(data.artwork, {
					x: 16,
					y: 16,
					width: 80,
					height: 80,
					radius: 4
				})
			: raw(""),
		title,
		artist
	});

	return svg2png(svg, { scale: 2 });
}
