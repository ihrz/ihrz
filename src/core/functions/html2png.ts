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

import { Browser, launch } from "puppeteer";
import * as apiUrlParser from "./apiUrlParser.js";

let browser: Browser | null = null;

export interface Html2PngOptions {
	width?: number;
	height?: number;
	scaleSize?: number;
	elementSelector?: string;
	omitBackground: boolean;
	selectElement: boolean;
}

export interface Html2PngAsset {
	token: string;
	mime: string;
	buffer: Buffer;
}

export default async function html2Png(
	code: string,
	options: Html2PngOptions,
	assets: Html2PngAsset[] = []
): Promise<Buffer> {
	if (client.config.api.HorizonGateway) {
		const endpoint = apiUrlParser.HorizonGatewayInternal(
			apiUrlParser.GatewayMethod.ImageGeneration
		);

		const form = new FormData();
		form.append("adminKey", client.config.api.apiToken);
		form.append("options", JSON.stringify(options));
		form.append("code", code);

		const meta: Record<string, { token: string; mime: string }> = {};
		assets.forEach((asset, index) => {
			const field = `asset${index}`;
			meta[field] = { token: asset.token, mime: asset.mime };
			form.append(
				field,
				new Blob([new Uint8Array(asset.buffer)], { type: asset.mime }),
				`${field}.png`
			);
		});
		form.append("assets", JSON.stringify(meta));

		const response = await fetch(endpoint, {
			method: "POST",
			body: form
		});

		if (response.status !== 200) {
			const message = await response.text().catch(() => "");
			throw new Error(
				`HorizonGateway image generation failed (HTTP ${response.status} on ${endpoint}): ${message}`
			);
		}

		const contentType = response.headers.get("content-type") ?? "";

		if (contentType && !contentType.includes("image/png")) {
			throw new Error(
				`HorizonGateway image generation returned an unexpected content type: ${contentType}`
			);
		}

		const buffer = Buffer.from(await response.arrayBuffer());

		if (buffer.length === 0) {
			throw new Error(
				"HorizonGateway image generation returned an empty image."
			);
		}

		return buffer;
	} else {
		let html = code;
		for (const asset of assets) {
			html = html.replaceAll(
				asset.token,
				`data:${asset.mime};base64,${asset.buffer.toString("base64")}`
			);
		}

		if (!browser)
			browser = await launch({
				args: ["--no-sandbox", "--disable-setuid-sandbox"]
			});
		return await localRender(html, options);
	}
}

async function localRender(
	code: string,
	options: Html2PngOptions = {
		width: 1280,
		height: 800,
		scaleSize: 1,
		elementSelector: ".container",
		omitBackground: false,
		selectElement: false
	}
): Promise<Buffer> {
	try {
		const page = await browser!.newPage();

		await page.setViewport({
			width: options.width ?? 1280,
			height: options.height ?? 800,
			deviceScaleFactor: options.scaleSize ?? 1
		});

		await page.setContent(code);

		let imageBuffer;
		if (options.selectElement && options.elementSelector) {
			await page.evaluate(() => {
				document.body.style.background = "transparent";
			});
			await page.evaluate((selector) => {
				const element: any = document.querySelector(selector);
				if (element) {
					element.style.margin = "0";
					element.style.padding = "0";
				}
			}, options.elementSelector);
			const element = await page.$(options.elementSelector);
			if (!element) throw new Error("Element not found");
			const boundingBox = await element.boundingBox();
			if (!boundingBox)
				throw new Error("Unable to get bounding box for the element");

			imageBuffer = await page.screenshot({
				clip: {
					x: boundingBox.x,
					y: boundingBox.y,
					width: boundingBox.width,
					height: boundingBox.height
				},
				type: "png",
				omitBackground: options.omitBackground
			});
		} else {
			imageBuffer = await page.screenshot({
				fullPage: true,
				omitBackground: options.omitBackground,
				type: "png",
				fromSurface: true
			});
		}

		await page.close();
		return Buffer.from(imageBuffer);
	} catch (error) {
		throw error;
	}
}
