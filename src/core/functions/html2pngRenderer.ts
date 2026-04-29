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
import { readFile } from 'node:fs/promises';

import { DEFAULT_HTML2PNG_OPTIONS, Html2PngOptions } from './html2pngProtocol.ts';

function numberFromEnv(name: string, fallback: number, min = 0): number {
	const raw = process.env[name];
	if (!raw) return fallback;

	const parsed = Number(raw);
	if (!Number.isFinite(parsed)) return fallback;

	return Math.max(min, parsed);
}

const HTML_CONTENT_TIMEOUT = numberFromEnv('HTML2PNG_CONTENT_TIMEOUT', 15_000, 1_000);
const HTML_ASSET_TIMEOUT = numberFromEnv('HTML2PNG_ASSET_TIMEOUT', 5_000, 0);
const MAX_CONCURRENT_RENDERS = Math.floor(numberFromEnv('HTML2PNG_MAX_CONCURRENCY', 2, 1));
const BROWSER_MAX_AGE_MS = numberFromEnv('HTML2PNG_BROWSER_MAX_AGE_MS', 30 * 60_000, 0);
const BROWSER_MAX_RENDERS = Math.floor(numberFromEnv('HTML2PNG_BROWSER_MAX_RENDERS', 500, 1));
const BROWSER_MAX_FAILURES = Math.floor(numberFromEnv('HTML2PNG_BROWSER_MAX_FAILURES', 3, 1));
const BROWSER_MAX_RSS_MB = numberFromEnv('HTML2PNG_BROWSER_MAX_RSS_MB', 1024, 0);
const BROWSER_CLOSE_TIMEOUT = numberFromEnv('HTML2PNG_BROWSER_CLOSE_TIMEOUT', 5_000, 500);

let browserPromise: Promise<Browser> | null = null;
let browserStartedAt = 0;
let browserRenderCount = 0;
let browserFailureCount = 0;
let recycleRequested = false;
let recyclePromise: Promise<void> | null = null;
let activeRenders = 0;
const renderQueue: (() => void)[] = [];

async function waitForRenderSlot<T>(task: () => Promise<T>): Promise<T> {
	if (activeRenders >= MAX_CONCURRENT_RENDERS) {
		await new Promise<void>((resolve) => renderQueue.push(resolve));
	} else {
		activeRenders++;
	}

	try {
		return await task();
	} finally {
		const next = renderQueue.shift();
		if (next) {
			next();
		} else {
			activeRenders--;
		}
	}
}

async function getBrowserRssMb(browser: Browser): Promise<number | null> {
	const pid = browser.process()?.pid;
	if (!pid) return null;

	try {
		const status = await readFile(`/proc/${pid}/status`, 'utf8');
		const match = status.match(/^VmRSS:\s+(\d+)\s+kB$/m);
		if (!match) return null;

		return Number(match[1]) / 1024;
	} catch {
		return null;
	}
}

async function shouldRecycleBrowser(browser: Browser): Promise<boolean> {
	if (!browser.connected) return true;
	if (recycleRequested) return true;
	if (BROWSER_MAX_AGE_MS > 0 && Date.now() - browserStartedAt >= BROWSER_MAX_AGE_MS) return true;
	if (browserRenderCount >= BROWSER_MAX_RENDERS) return true;
	if (browserFailureCount >= BROWSER_MAX_FAILURES) return true;

	if (BROWSER_MAX_RSS_MB > 0) {
		const rssMb = await getBrowserRssMb(browser);
		if (rssMb !== null && rssMb >= BROWSER_MAX_RSS_MB) return true;
	}

	return false;
}

async function closeBrowser(browser: Browser): Promise<void> {
	await Promise.race([
		browser.close(),
		new Promise<void>((resolve) => setTimeout(resolve, BROWSER_CLOSE_TIMEOUT)),
	]).catch(() => undefined);
}

async function recycleBrowserIfIdle(): Promise<void> {
	if (!browserPromise || activeRenders > 1) return;
	if (recyclePromise) return await recyclePromise;

	recyclePromise = (async () => {
		const browser = await browserPromise!.catch(() => null);
		if (!browser) {
			browserPromise = null;
			return;
		}

		if (!await shouldRecycleBrowser(browser)) return;

		browserPromise = null;
		recycleRequested = false;
		browserStartedAt = 0;
		browserRenderCount = 0;
		browserFailureCount = 0;

		await closeBrowser(browser);
	})();

	try {
		await recyclePromise;
	} finally {
		recyclePromise = null;
	}
}

async function waitForPageAssets(page: Awaited<ReturnType<Browser['newPage']>>): Promise<void> {
	await page.evaluate((assetTimeout) => {
		const timeout = new Promise<void>((resolve) => {
			window.setTimeout(resolve, assetTimeout);
		});

		const fontsReady = document.fonts?.ready?.then(() => undefined).catch(() => undefined) ?? Promise.resolve();
		const imagesReady = Promise.all(
			Array.from(document.images)
				.filter((image) => !image.complete)
				.map((image) => new Promise<void>((resolve) => {
					image.addEventListener('load', () => resolve(), { once: true });
					image.addEventListener('error', () => resolve(), { once: true });
				}))
		).then(() => undefined);

		return Promise.race([
			Promise.all([fontsReady, imagesReady]).then(() => undefined),
			timeout,
		]);
	}, HTML_ASSET_TIMEOUT).catch(() => undefined);
}

async function launchBrowser(): Promise<Browser> {
	const browser = await puppeteer.launch({
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});

	browserStartedAt = Date.now();
	browserRenderCount = 0;
	browserFailureCount = 0;
	recycleRequested = false;

	browser.once('disconnected', () => {
		browserPromise = null;
		recycleRequested = false;
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
	return await waitForRenderSlot(async () => {
		await recycleBrowserIfIdle();

		const browser = await getBrowser();
		const page = await browser.newPage();

		try {
			page.setDefaultNavigationTimeout(HTML_CONTENT_TIMEOUT);
			page.setDefaultTimeout(HTML_CONTENT_TIMEOUT);

			await page.setViewport({
				width: options.width ?? DEFAULT_HTML2PNG_OPTIONS.width ?? 1280,
				height: options.height ?? DEFAULT_HTML2PNG_OPTIONS.height ?? 800,
				deviceScaleFactor: options.scaleSize ?? DEFAULT_HTML2PNG_OPTIONS.scaleSize ?? 1,
			});

			await page.setContent(code, {
				waitUntil: 'load',
				timeout: HTML_CONTENT_TIMEOUT,
			});
			await waitForPageAssets(page);

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

			browserRenderCount++;
			return Buffer.from(imageBuffer);
		} catch (error) {
			browserFailureCount++;
			if (browserFailureCount >= BROWSER_MAX_FAILURES) {
				recycleRequested = true;
			}

			throw error;
		} finally {
			await page.close().catch(() => undefined);
			await recycleBrowserIfIdle();
		}
	});
}
