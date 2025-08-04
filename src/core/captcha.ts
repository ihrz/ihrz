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

import { randomInt } from 'crypto';
import html2Png from './functions/html2png.ts';

async function captcha(): Promise<{ code: string; image: Buffer }> {
	const captchaCode = generateRandomCode();

	return {
		code: captchaCode,
		image: await html2Png(globalThis.client.htmlfiles["captcha"]
			.replace("{X}", captchaCode), {
			omitBackground: true,
			selectElement: true,
			elementSelector: ".captcha-container",
			height: 300,
			width: 900
		})
	};
}

function generateRandomCode(): string {
	const characters = 'ABCDEFGHIKLMNOPQRSTUVWXYZabcdefghiklmnopqrstuvwxyz0123456789';
	let code = '';
	for (let i = 0; i < 7; i++) {
		const randomIndex = randomInt(0, characters.length);
		code += characters.charAt(randomIndex);
	}
	return code;
}

export default captcha;