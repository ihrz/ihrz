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

import puppeteer, { Browser } from 'puppeteer';

import { DEFAULT_HTML2PNG_OPTIONS, Html2PngOptions } from './html2pngProtocol.ts';

let browserPromise: Promise<Browser> | null = null;

async function launchBrowser(): Promise<Browser> {
	const browser = await puppeteer.launch({
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});

	browser.once('disconnected', () => {
		browserPromise = null;
	});

	return browser;
}

async function getBrowser(): Promise<Browser> {
	if (!browserPromise) {
		browserPromise = launchBrowser();
	}

	let browser = await browserPromise;

	if (!browser.connected) {
		browserPromise = launchBrowser();
		browser = await browserPromise;
	}

	return browser;
}

export async function renderHtmlToPng(
	code: string,
	options: Html2PngOptions = DEFAULT_HTML2PNG_OPTIONS
): Promise<Buffer> {
	const browser = await getBrowser();
	const page = await browser.newPage();

	try {
		await page.setViewport({
			width: options.width ?? DEFAULT_HTML2PNG_OPTIONS.width ?? 1280,
			height: options.height ?? DEFAULT_HTML2PNG_OPTIONS.height ?? 800,
			deviceScaleFactor: options.scaleSize ?? DEFAULT_HTML2PNG_OPTIONS.scaleSize ?? 1,
		});

		await page.setContent(code);

		let imageBuffer;
		if (options.selectElement && options.elementSelector) {
			await page.evaluate(() => {
				document.body.style.background = 'transparent';
			});
			await page.evaluate((selector) => {
				const element: HTMLElement | null = document.querySelector(selector);
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

		return Buffer.from(imageBuffer);
	} finally {
		await page.close().catch(() => undefined);
	}
}
