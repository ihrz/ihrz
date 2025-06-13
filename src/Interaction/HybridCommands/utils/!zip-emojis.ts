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

		const emojis = interaction.guild.emojis.cache;
		const zip = new JSZip();

		try {
			// Download and add all emojis to the zip
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

					zip.file(emojiName, Buffer.from(response.data));
				} catch {
					// Silently handle individual emoji errors
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
				content: lang.zip_emojis_command_work
					.replace("${calcTime}", String(calcTime))
					.replace("${emojis.size}", String(emojis.size)),
				files: [{
					attachment: archiveBuffer,
					name: 'server_emojis.zip'
				}],
				flags: [1 << 6]
			});

		} catch (error) {
			await client.func.method.interactionSend(interaction, {
				content: lang.zip_emojis_command_error,
				flags: [1 << 6]
			});
		}
	}
};