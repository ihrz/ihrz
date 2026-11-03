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

import { randomInt } from "crypto";

import svg2png from "./functions/svg2png.js";
import { fill, measure, raw } from "./functions/svgKit.js";

const FONT_SIZE = 38;
const LETTER_SPACING = 6;
const PADDING_X = 52;
const HEIGHT = 80;
// Rendered at 2x: sharper than the old 1x Chromium screenshot.
const SCALE = 2;

function between(min: number, max: number): number {
	return min + (max - min) * (randomInt(0, 10_000) / 10_000);
}

/**
 * Every glyph gets its own rotation and offset, and the noise strokes are
 * random on each render: the old template drew the same lines every time,
 * which made the captcha trivial to clean up before OCR.
 */
async function drawCode(
	code: string
): Promise<{ markup: string; width: number }> {
	const style = { size: FONT_SIZE, family: "Rye" as const };
	const glyphs: string[] = [];
	let x = PADDING_X;

	for (const char of code) {
		const advance = await measure(char, style);
		const centerX = x + advance / 2;
		const y = HEIGHT / 2 + FONT_SIZE * 0.35 + between(-5, 5);
		const angle = between(-14, 14).toFixed(1);
		glyphs.push(
			`<text x="${centerX.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" transform="rotate(${angle} ${centerX.toFixed(1)} ${(HEIGHT / 2).toFixed(1)})">${char}</text>`
		);
		x += advance + LETTER_SPACING;
	}

	return { markup: glyphs.join(""), width: x - LETTER_SPACING + PADDING_X };
}

function drawNoise(width: number, strokes: number, front: boolean): string {
	const paths: string[] = [];
	for (let i = 0; i < strokes; i++) {
		const x1 = between(0, width * 0.3);
		const x2 = between(width * 0.7, width);
		const y1 = between(5, HEIGHT - 5);
		const y2 = between(5, HEIGHT - 5);
		const cx = between(width * 0.3, width * 0.7);
		const cy = between(-HEIGHT * 0.5, HEIGHT * 1.5);
		const strokeWidth = front ? between(1.4, 2.4) : between(0.6, 1.2);
		const opacity = front ? between(0.5, 0.75) : between(0.2, 0.4);
		paths.push(
			`<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke-width="${strokeWidth.toFixed(2)}" opacity="${opacity.toFixed(2)}"/>`
		);
	}
	return paths.join("");
}

async function captcha(): Promise<{ code: string; image: Buffer }> {
	const captchaCode = generateRandomCode();
	const { markup, width } = await drawCode(captchaCode);
	const roundedWidth = Math.ceil(width);

	const svg = fill(globalThis.client.svgfiles["captcha"], {
		width: roundedWidth,
		height: HEIGHT,
		code: raw(markup),
		noise_back: raw(drawNoise(roundedWidth, 6, false)),
		noise_front: raw(drawNoise(roundedWidth, 4, true))
	});

	return {
		code: captchaCode,
		image: await svg2png(svg, { scale: SCALE })
	};
}

function generateRandomCode(): string {
	const characters = "ABCDEFGHIKLMNOPQRSTUVWXYZ0123456789";
	let code = "";
	for (let i = 0; i < 7; i++) {
		const randomIndex = randomInt(0, characters.length);
		code += characters.charAt(randomIndex);
	}
	return code;
}

export default captcha;
