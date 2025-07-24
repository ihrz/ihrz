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

import {
	ChatInputCommandInteraction,
	Client,
	Message,
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';
import { SubCommand } from '../../../../types/command.js';

import { isValidImageType } from '../../SlashCommands/guildconfig/!footer-pfp.js';
import { GifUtil, GifFrame, BitmapImage, GifCodec } from 'gifwrap';
import Jimp from 'jimp';

async function createGifFromUrl(imageUrl: string): Promise<Buffer> {
	try {
		// Load image with Jimp and resize
		const image = await Jimp.read(imageUrl);

		// Create BitmapImage from Jimp
		const bitmapImage = new BitmapImage(image.bitmap);

		// Quantize colors to 256 maximum for GIF format
		GifUtil.quantizeWu([bitmapImage], 256);

		// Create two identical frames for animation
		const frame1 = new GifFrame(bitmapImage, { delayCentisecs: 50 });
		const frame2 = new GifFrame(bitmapImage, { delayCentisecs: 50 });

		// Create the GIF using GifCodec
		const codec = new GifCodec();
		const gif = await codec.encodeGif([frame1, frame2], { loops: 0 });

		// Return the GIF buffer
		return gif.buffer;

	} catch (error) {
		throw error;
	}
}
export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var image = interaction.options.getAttachment("image", true);
		} else {
			var image = interaction.attachments.first()!
		}

		if (!isValidImageType(image.contentType)) {
			client.func.method.interactionSend(interaction, { content: client.iHorizon_Emojis.No })
			return
		}

		try {
			const res = await createGifFromUrl(image.url!);

			client.func.method.interactionSend(interaction, {
				files: [
					{
						name: "togif.gif",
						attachment: res
					}
				]
			});
		} catch (error) {
			throw 'Failed to create GIF:' + error
		}
	},
};