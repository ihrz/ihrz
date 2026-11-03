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
import { fetchImage } from "../../../core/functions/svgKit.js";

const MAX_GIF_SIDE = 512;

/**
 * The attachment is downloaded as PNG: Discord's media proxy converts on
 * `format=png` (see svgKit.fetchImage), so WebP never reaches Jimp and no
 * headless browser is needed to decode it anymore.
 */
async function createGifFromUrl(imageUrl: string): Promise<Buffer> {
	const source = await fetchImage(imageUrl);
	if (!source) throw new Error("Image unavailable or not decodable");

	const image = await Jimp.read(source);

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
			var image = interaction.attachments.first()!;
		}

		if (!image?.url || !client.func.validImageType(image.contentType)) {
			await client.func.method.interactionSend(interaction, {
				content: client.iHorizon_Emojis.No
			});
			return;
		}

		try {
			const res = await createGifFromUrl(image.url);

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
