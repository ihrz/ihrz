/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import puppeteer, { Browser } from 'puppeteer';

let browser: Browser | null = await puppeteer.launch({
	args: ['--no-sandbox', '--disable-setuid-sandbox']
});

export default async function html2Png(
	code: string,
	options: {
		width?: number;
		height?: number;
		scaleSize?: number;
		elementSelector?: string;
		omitBackground: boolean;
		selectElement: boolean;
	} = {
			width: 1280,
			height: 800,
			scaleSize: 1,
			elementSelector: '.container',
			omitBackground: false,
			selectElement: false,
		}
): Promise<Buffer> {
	try {
		if (browser === null) {
			browser = await puppeteer.launch({
				args: ['--no-sandbox', '--disable-setuid-sandbox']
			});
		}
		if (!browser?.connected) {
			browser = await puppeteer.launch({
				args: ['--no-sandbox', '--disable-setuid-sandbox']
			});
			return await html2Png(code, options);
		}

		const page = await browser.newPage();

		await page.setViewport({
			width: options.width ?? 1280,
			height: options.height ?? 800,
			deviceScaleFactor: options.scaleSize ?? 1,
		});

		await page.setContent(code);

		let imageBuffer;
		if (options.selectElement && options.elementSelector) {
			await page.evaluate(() => {
				document.body.style.background = 'transparent';
			});
			await page.evaluate((selector) => {
				const element: any = document.querySelector(selector);
				if (element) {
					element.style.margin = '0';
					element.style.padding = '0';
				}
			}, options.elementSelector);
			const element = await page.$(options.elementSelector);
			if (!element) throw new Error('Element not found');
			const boundingBox = await element.boundingBox();
			if (!boundingBox) throw new Error('Unable to get bounding box for the element');

			imageBuffer = await page.screenshot({
				clip: {
					x: boundingBox.x,
					y: boundingBox.y,
					width: boundingBox.width,
					height: boundingBox.height,
				},
				type: 'png',
				omitBackground: options.omitBackground,
			});
		} else {
			imageBuffer = await page.screenshot({
				fullPage: true,
				omitBackground: options.omitBackground,
				type: 'png',
				fromSurface: true,
			});
		}

		await page.close();
		return Buffer.from(imageBuffer);
	} catch (error) {
		throw error;
	}
}