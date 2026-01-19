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

import {
	Attachment,
	ChatInputCommandInteraction,
	Client,
	Message
} from 'discord.js';
import { LanguageData } from '../../../../../types/languageData.js';
import { SubCommand } from '../../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (!interaction.guild) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var zipAttachment = interaction.options.getAttachment("zip_file", true)
		} else {
			var zipAttachment = interaction.attachments.first()!
		}

		if (!zipAttachment) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_unzip_emojis_command_no_file,
				flags: [1 << 6]
			});
			return;
		}

		const time = Date.now();

		try {
			const response = await fetch(zipAttachment.url);
			const zipBuffer = await response.arrayBuffer();

			const zip = new Bun.Archive(zipBuffer);
			const entries = await zip.files();

			const emojis: { name: string; entry: File }[] = [];

			for (const [_, entry] of entries) {
				const bareFileName = entry.name.split('/').pop() ?? '';
				const match = bareFileName.match(/^(.+)_(\d+)\.(png|gif)$/);
				if (!match) continue;

				const [, rawName] = match;

				const cleanedName = rawName.replace(/_/g, ' ');
				const emojiName = cleanedName
					.replace(/[^\w\s]/g, '')
					.slice(0, 32);

				if (
					interaction.guild.emojis.cache.some(
						emoji => emoji.name === emojiName
					)
				) {
					continue;
				}

				emojis.push({ name: emojiName, entry });

				if (emojis.length >= 50) break;
			}

			const created = await Promise.all(
				emojis.map(async ({ name, entry }) => {
					try {
						const buffer = await entry.arrayBuffer();

						return await interaction.guild!.emojis.create({
							name,
							attachment: Buffer.from(buffer)
						});
					} catch {
						return null;
					}
				})
			);

			const createdEmojis = created.filter(Boolean);

			// Respond with results
			const calcTime = Date.now() - time;
			await client.func.method.interactionSend(interaction, {
				content: lang.util_unzip_emojis_command_work
					.replace("${calcTime}", String(calcTime))
					.replace("${emojiCount}", String(createdEmojis.length)),
				flags: [1 << 6]
			});

		} catch (error) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_unzip_emojis_command_error,
				flags: [1 << 6]
			});
		}
	}
};