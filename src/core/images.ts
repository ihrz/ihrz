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

import path from "path";

import svg2png from "./functions/svg2png.js";
import { resourcePath } from "./modules/resources.js";
import {
	fetchImage,
	fill,
	image,
	imageSize,
	paragraph,
	raw,
	SvgMarkup,
	wrap
} from "./functions/svgKit.js";

const MEME_WIDTH = 512;
const MEME_FONT_SIZE = 40;
const MEME_LINE_HEIGHT = 46;
const MEME_TEXT_WIDTH = MEME_WIDTH - 20;
const MEME_MAX_LINES = 4;
const HEART_PATH = resourcePath("assets", "heart.png");

const memeText = {
	size: MEME_FONT_SIZE,
	family: "Anton" as const,
	letterSpacing: 1,
	maxWidth: MEME_TEXT_WIDTH,
	lineHeight: MEME_LINE_HEIGHT,
	maxLines: MEME_MAX_LINES,
	anchor: "middle" as const,
	x: MEME_WIDTH / 2
};

/**
 * Downloads the source image (Discord attachment, avatar or API result)
 * through the public-only fetcher: the HTML templates let Chromium load any
 * URL, and the meme text was injected as HTML into the page.
 */
async function loadImage(url: string): Promise<{
	buffer: Buffer;
	height: number;
}> {
	const buffer = await fetchImage(url);
	if (!buffer) throw new Error(`Image unavailable: ${url}`);
	const size = imageSize(buffer);
	const height = size
		? Math.round((MEME_WIDTH * size.height) / size.width)
		: MEME_WIDTH;
	return { buffer, height: Math.min(height, MEME_WIDTH * 3) };
}

function memeImage(buffer: Buffer, y: number, height: number): SvgMarkup {
	return image(buffer, { x: 0, y, width: MEME_WIDTH, height });
}

async function love(user1: string, user2: string): Promise<Buffer> {
	const [avatarA, avatarB, heart] = await Promise.all([
		fetchImage(user1),
		fetchImage(user2),
		Bun.file(HEART_PATH)
			.arrayBuffer()
			.then((data) => Buffer.from(data))
	]);
	const tile = (buffer: Buffer | null, x: number) =>
		buffer ? image(buffer, { x, y: 0, width: 400, height: 400 }) : raw("");

	return svg2png(
		fill(globalThis.client.svgfiles["love"], {
			user_a: tile(avatarA, 0),
			heart: tile(heart, 420),
			user_b: tile(avatarB, 840)
		})
	);
}

async function catsay(img: string, text: string): Promise<Buffer> {
	const { buffer, height } = await loadImage(img);
	const caption = await paragraph(text.toUpperCase(), {
		...memeText,
		y: 10 + MEME_FONT_SIZE,
		fill: "#ffffff",
		attributes:
			'stroke="#000000" stroke-width="4" stroke-linejoin="round" paint-order="stroke"'
	});

	return svg2png(
		fill(globalThis.client.svgfiles["memeTopText"], {
			height,
			image: memeImage(buffer, 0, height),
			text: caption
		})
	);
}

async function captions(img: string, text: string): Promise<Buffer> {
	const { buffer, height } = await loadImage(img);
	const lines = Math.max(
		1,
		(
			await wrap(
				text.toUpperCase(),
				MEME_TEXT_WIDTH - 20,
				memeText,
				MEME_MAX_LINES
			)
		).length
	);
	const captionHeight = 40 + lines * MEME_LINE_HEIGHT;
	const caption = await paragraph(text.toUpperCase(), {
		...memeText,
		maxWidth: MEME_TEXT_WIDTH - 20,
		y: 20 + MEME_FONT_SIZE,
		fill: "#000000"
	});

	return svg2png(
		fill(globalThis.client.svgfiles["memeCaption"], {
			height: captionHeight + height,
			caption_height: captionHeight,
			text: caption,
			image: memeImage(buffer, captionHeight, height)
		})
	);
}

async function bubbles(img: string): Promise<Buffer> {
	const { buffer, height } = await loadImage(img);
	return svg2png(
		fill(globalThis.client.svgfiles["memeBubble"], {
			height,
			image: memeImage(buffer, 0, height)
		})
	);
}

export { love, catsay, captions, bubbles };
