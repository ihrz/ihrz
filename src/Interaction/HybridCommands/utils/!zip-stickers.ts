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
} from 'discord.js';
import JSZip from 'jszip';
import { LanguageData } from '../../../../types/languageData.js';
import { SubCommand } from '../../../../types/command.js';

import { axios } from '../../../core/functions/axios.js';

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		let time = Date.now();
		if (!interaction.guild) return;

		const stickers = interaction.guild.stickers.cache;
		const zip = new JSZip();

		try {
			// Download and add all stickers to the zip
			const downloadPromises = Array.from(stickers.values()).map(async (sticker) => {
				try {
					let format = '';
					switch (sticker.format) {
						case 1:
							format = 'png';
							break;
						case 2:
							format = 'apng';
							break;
						case 3:
							format = 'lottie';
							break;
						case 4:
							format = 'gif';
							break;
					}
					const stickerName = `${sticker.name}_${sticker.id}.${format}`;
					const stickerUrl = sticker.url;

					if (!stickerUrl) {
						return;
					}

					const response = await axios.get(stickerUrl, {
						responseType: 'arrayBuffer'
					});

					zip.file(stickerName, Buffer.from(response.data));
				} catch {
					// Silently handle individual sticker errors
				}
			});

			// Wait for all downloads to complete
			await Promise.all(downloadPromises);

			// Generate the zip file with high compression
			const archiveBuffer = await zip.generateAsync({
				type: 'nodebuffer',
				compression: 'DEFLATE',
				compressionOptions: {
					level: 9
				}
			});

			// Calculate time taken
			let calcTime = Date.now() - time;

			// Send the zip file
			await client.func.method.interactionSend(interaction, {
				content: lang.zip_stickers_command_work
					.replace("${calcTime}", String(calcTime))
					.replace("${stickers.size}", String(stickers.size)),
				files: [{
					attachment: archiveBuffer,
					name: 'server_stickers.zip'
				}],
				flags: [1 << 6]
			});

		} catch (error) {
			await client.func.method.interactionSend(interaction, {
				content: lang.zip_stickers_command_error,
				flags: [1 << 6]
			});
		}
	}
};