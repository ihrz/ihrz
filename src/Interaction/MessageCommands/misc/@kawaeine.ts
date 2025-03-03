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
	ApplicationCommandOptionType,
	Message,
	Client,
} from 'discord.js';

import path from 'path';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { axios } from '../../../core/functions/axios.js';
import { convertToPng, resizeImage, tempDir } from '../../../core/functions/mediaManipulation.js';
import { unlink } from 'fs/promises';

export const command: Command = {
	name: 'kawaeine',
	aliases: ['meme3'],
	description: 'kawaeine meme generator',
	description_localizations: {
		"fr": "kawaeine meme generator",
	},
	options: [
		{
			name: "image1",
			description: "the before sucks",
			description_localizations: {
				"fr": "le screen qui te fait dire que ça va mal",
			},
			type: ApplicationCommandOptionType.String,
			required: false,

			permission: null
		},
	],
	thinking: false,
	category: 'misc',
	type: "PREFIX_IHORIZON_COMMAND",
	permission: null,
	run: async (
		client: Client,
		interaction: Message<true>,
		lang: LanguageData,
		options?: string[],
	) => {
		if (interaction.guild.preferredLocale !== 'fr') return;

		if (await client.func.helper.coolDown(interaction, "media_manipulation", client.timeCalculator.to_ms("1m30s")!)) {
			return interaction.reply({ content: lang.media_gen_cooldown })
		};

		const beforeSucksUrl = client.func.method.string(options!, 0) || interaction.attachments.first()?.url;

		if (!beforeSucksUrl) {
			return interaction.reply({ content: lang.media_gen_error_args });
		}

		try {
			const beforeSucksResponse = await axios.get(beforeSucksUrl, { responseType: 'arraybuffer' });

			const beforeSucksResizedPath = path.join(tempDir, `beforeSucksResized-${interaction.id}.png`);

			await resizeImage(await convertToPng(Buffer.from(beforeSucksResponse.data)), beforeSucksResizedPath, 1920, 1080);

			const rapRealityPath = path.join(process.cwd(), 'src', 'assets', 'kawaeine');

			let data = await client.kdenlive.open(path.join(rapRealityPath, 'meme3.kdenlive'));

			data = data.replace("/home/anais/Documents/GitHub/ihrz/src/assets/kawaeine", tempDir)
				.replaceAll("before.mp4", path.join(rapRealityPath, 'before.mp4'))
				.replaceAll("after.mp4", path.join(rapRealityPath, 'after.mp4'))
				.replaceAll("oof.mp3", path.join(rapRealityPath, 'oof.mp3'))
				.replaceAll("placeholder.png", beforeSucksResizedPath);

			let outPath = await client.kdenlive.tempSave(data);
			let exported = await client.kdenlive.export(outPath);

			await interaction.reply({
				files: [{
					attachment: exported,
					name: 'merged_video.mp4'
				}]
			});

			await unlink(exported);
			await unlink(beforeSucksResizedPath);
		} catch (error) {
			interaction.reply(`An error occurred: ${(error as any).message}`);
		}
	}
}