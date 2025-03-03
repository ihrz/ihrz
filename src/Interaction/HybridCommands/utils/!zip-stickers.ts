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

import {
	ChatInputCommandInteraction,
	Client,
	Message,
	PermissionsBitField
} from 'discord.js';
import archiver from 'archiver';
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

		return new Promise<void>((resolve, reject) => {
			const archive = archiver('zip', { zlib: { level: 9 } });
			const chunks: Buffer[] = [];

			archive.on('data', (chunk) => {
				chunks.push(chunk);
			});

			archive.on('end', async () => {
				const archiveBuffer = Buffer.concat(chunks);
				let calcTime = Date.now() - time;
				try {
					await interaction.reply({
						content: lang.zip_stickers_command_work
							.replace("${calcTime}", String(calcTime))
							.replace("${stickers.size}", String(stickers.size)),
						files: [{
							attachment: archiveBuffer,
							name: 'server_stickers.zip'
						}],
						ephemeral: true
					});
					resolve();
				} catch (error) {
					await interaction.reply({
						content: lang.zip_stickers_command_error,
						ephemeral: true
					});
					reject(error);
				}
			});

			archive.on('error', (err) => {
				reject(err);
			});

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

					archive.append(Buffer.from(response.data), { name: stickerName });
				} catch {
				}
			});

			Promise.all(downloadPromises)
				.then(() => archive.finalize())
				.catch(reject);
		});
	}
};