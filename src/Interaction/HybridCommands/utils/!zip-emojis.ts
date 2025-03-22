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
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	GuildEmoji,
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

		const emojis = interaction.guild.emojis.cache;

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
						content: lang.zip_emojis_command_work
							.replace("${calcTime}", String(calcTime))
							.replace("${emojis.size}", String(emojis.size)),
						files: [{
							attachment: archiveBuffer,
							name: 'server_emojis.zip'
						}],
						flags: [1 << 6]
					});
					resolve();
				} catch (error) {
					await interaction.reply({
						content: lang.zip_emojis_command_error,
						flags: [1 << 6]
					});
					reject(error);
				}
			});

			archive.on('error', (err) => {
				reject(err);
			});

			const downloadPromises = Array.from(emojis.values()).map(async (emoji) => {
				try {
					const emojiName = `${emoji.name}_${emoji.id}${emoji.animated ? '.gif' : '.png'}`;
					const emojiUrl = emoji.imageURL({ size: 2048, extension: emoji.animated ? "gif" : "png" });

					if (!emojiUrl) {
						return;
					}

					const response = await axios.get(emojiUrl, {
						responseType: 'arrayBuffer'
					});

					archive.append(Buffer.from(response.data), { name: emojiName });
				} catch {
				}
			});

			Promise.all(downloadPromises)
				.then(() => archive.finalize())
				.catch(reject);
		});
	}
};