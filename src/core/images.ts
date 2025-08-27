/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import html2Png from './functions/html2png.ts';

async function love(user1: string, user2: string): Promise<Buffer> {
	return await html2Png(globalThis.client.htmlfiles["love"]
		.replace("{Y}", "https://gitlab.com/ihrz/ihrz/-/raw/production/src/assets/heart.png")
		.replace("{X}", user1)
		.replace("{Z}", user2), {
		omitBackground: true,
		selectElement: true,
		elementSelector: ".love-container",
		width: 1600,
		height: 600,
		scaleSize: 1
	})
}

async function catsay(img: string, text: string): Promise<Buffer> {
	return await html2Png(globalThis.client.htmlfiles["catsay"]
		.replace("{X}", img)
		.replace("{Z}", text), {
		omitBackground: true,
		selectElement: true,
		elementSelector: ".meme-container",
	});
}

async function captions(img: string, text: string): Promise<Buffer> {
	return await html2Png(globalThis.client.htmlfiles["captions"]
		.replace("{X}", img)
		.replace("{Z}", text), {
		omitBackground: true,
		selectElement: true,
		elementSelector: ".meme-container",
	});
}

async function bubbles(img: string): Promise<Buffer> {
	return await html2Png(globalThis.client.htmlfiles["bubbles"]
		.replace("{X}", img), {
		omitBackground: true,
		selectElement: true,
		elementSelector: ".meme-container",
	});
}

export {
	love,
	catsay,
	captions,
	bubbles
};