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

import { ChatInputCommandInteraction, Client, Message } from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";

import { GifUtil, GifFrame, BitmapImage, GifCodec } from "gifwrap";
import Jimp from "jimp";
import { Browser, launch } from "puppeteer";
import { existsSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_GIF_SIDE = 512;
const FETCH_TIMEOUT_MS = 15_000;

let fallbackBrowser: Browser | null = null;

function resolveChromiumPath(): string | undefined {
	const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH;
	if (fromEnv && existsSync(fromEnv)) return fromEnv;

	const cacheDir = path.join(
		os.homedir(),
		".cache",
		"puppeteer",
		"chrome-headless-shell"
	);
	if (!existsSync(cacheDir)) return undefined;
	const versions = readdirSync(cacheDir)
		.filter((entry) => entry.startsWith("linux-"))
		.sort()
		.reverse();
	for (const entry of versions) {
		const candidate = path.join(
			cacheDir,
			entry,
			"chrome-headless-shell-linux64",
			"chrome-headless-shell"
		);
		if (existsSync(candidate)) return candidate;
	}
	return undefined;
}

async function getFallbackBrowser(): Promise<Browser | null> {
	if (fallbackBrowser) return fallbackBrowser;
	try {
		const executablePath = resolveChromiumPath();
		fallbackBrowser = await launch({
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
			...(executablePath ? { executablePath } : {})
		});
		return fallbackBrowser;
	} catch {
		return null;
	}
}

// Jimp cannot decode some formats Discord serves (notably webp).
// Decode those through a headless browser canvas into PNG first.
async function decodeWithBrowser(
	buffer: Buffer,
	mime: string
): Promise<Buffer> {
	const browser = await getFallbackBrowser();
	if (!browser) throw new Error("Browser unavailable for image decode");

	const page = await browser.newPage();
	try {
		await page.setContent(
			`<html><body style="margin:0;background:#fff"><img id="src" src="data:${mime};base64,${buffer.toString("base64")}" style="display:block" /></body></html>`,
			{ waitUntil: "load", timeout: FETCH_TIMEOUT_MS }
		);
		const pngDataUrl = await page.evaluate(async () => {
			const img = document.getElementById("src") as HTMLImageElement;
			if (!img.complete) {
				await new Promise<void>((resolve, reject) => {
					img.onload = () => resolve();
					img.onerror = () =>
						reject(new Error("Image failed to load"));
				});
			}
			if (!img.naturalWidth || !img.naturalHeight) {
				throw new Error("Image is not decodable");
			}
			const canvas = document.createElement("canvas");
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;
			canvas.getContext("2d")!.drawImage(img, 0, 0);
			return canvas.toDataURL("image/png");
		});
		return Buffer.from(pngDataUrl.split(",")[1], "base64");
	} finally {
		await page.close().catch(() => {});
	}
}

async function createGifFromUrl(
	imageUrl: string,
	contentType?: string | null
): Promise<Buffer> {
	const response = await fetch(imageUrl, {
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
	});
	if (!response.ok) {
		throw new Error(`Image download failed (HTTP ${response.status})`);
	}
	const mime =
		response.headers
			.get("content-type")
			?.split(";")[0]
			?.trim()
			.toLowerCase() ||
		contentType ||
		"image/png";
	const source = Buffer.from(await response.arrayBuffer());
	if (source.length === 0) throw new Error("Downloaded image is empty");
	if (source.length > MAX_SOURCE_BYTES) {
		throw new Error("Downloaded image exceeds the size limit");
	}

	let image: Jimp;
	try {
		image = await Jimp.read(source);
	} catch {
		image = await Jimp.read(await decodeWithBrowser(source, mime));
	}

	if (!image.getWidth() || !image.getHeight()) {
		throw new Error("Image has invalid dimensions");
	}

	if (Math.max(image.getWidth(), image.getHeight()) > MAX_GIF_SIDE) {
		if (image.getWidth() >= image.getHeight()) {
			image.resize(MAX_GIF_SIDE, Jimp.AUTO);
		} else {
			image.resize(Jimp.AUTO, MAX_GIF_SIDE);
		}
	}

	// GIF only supports 1-bit transparency: flatten alpha on white so
	// transparent PNGs do not come out with black halos or broken frames.
	const flattened = new Jimp(image.getWidth(), image.getHeight(), 0xffffffff);
	flattened.composite(image, 0, 0);

	// Create BitmapImage from Jimp
	const bitmapImage = new BitmapImage(flattened.bitmap);

	// Quantize colors to 256 maximum for GIF format
	GifUtil.quantizeWu([bitmapImage], 256);

	// Create two identical frames for animation
	const frame1 = new GifFrame(bitmapImage, { delayCentisecs: 50 });
	const frame2 = new GifFrame(bitmapImage, { delayCentisecs: 50 });

	// Create the GIF using GifCodec
	const codec = new GifCodec();
	const gif = await codec.encodeGif([frame1, frame2], { loops: 0 });

	// Return the GIF buffer
	return Buffer.from(gif.buffer);
}
export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing (DM-compatible: no guild/member requirement)
		if (!client.user || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var image = interaction.options.getAttachment("image", true);
		} else {
			var image = interaction.attachments.first();
		}

		if (!image?.url || !client.func.validImageType(image.contentType)) {
			await client.func.method.interactionSend(interaction, {
				content: client.iHorizon_Emojis.No
			});
			return;
		}

		try {
			const res = await createGifFromUrl(image.url, image.contentType);

			await client.func.method.interactionSend(interaction, {
				files: [
					{
						name: "togif.gif",
						attachment: res
					}
				]
			});
		} catch (error) {
			logger.err(`togif conversion failed for ${image.url}: ${error}`);
			await client.func.method.interactionSend(interaction, {
				content: client.iHorizon_Emojis.No
			});
		}
	}
};
