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
    name: 'rap-vs-reality',
    aliases: ['meme1'],
    description: 'rap vs reality meme generator',
    description_localizations: {
        "fr": "rap vs reality meme generator",
    },
    options: [
        {
            name: "image1",
            description: "the before sucks",
            description_localizations: {
                "fr": "le screen avant qu'il ce fasse défon",
            },
            type: ApplicationCommandOptionType.String,
            required: false,

            permission: null
        },
        {
            name: "image2",
            description: "the after sucks",
            description_localizations: {
                "fr": "le screen après qu'il ce soit défoncé",
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
        const bigSucksUrl = client.func.method.string(options!, 1) || interaction.attachments.last()?.url;

        if (!beforeSucksUrl || !bigSucksUrl) {
            return interaction.reply({ content: lang.media_gen_error_args });
        }

        try {
            const beforeSucksResponse = await axios.get(beforeSucksUrl, { responseType: 'arraybuffer' });
            const bigSucksResponse = await axios.get(bigSucksUrl, { responseType: 'arraybuffer' });

            const beforeSucksResizedPath = path.join(tempDir, `beforeSucksResized-${interaction.id}.png`);
            const bigSucksResizedPath = path.join(tempDir, `bigSucksResized-${interaction.id}.png`);

            await resizeImage(await convertToPng(Buffer.from(beforeSucksResponse.data)), beforeSucksResizedPath, 1920, 1080);
            await resizeImage(await convertToPng(Buffer.from(bigSucksResponse.data)), bigSucksResizedPath, 1920, 1080);

            const rapRealityPath = path.join(process.cwd(), 'src', 'assets', 'rap-vs-reality');

            let data = await client.kdenlive.open(path.join(rapRealityPath, 'meme1.kdenlive'));

            data = data.replace("/home/anais/Documents/GitHub/ihrz/src/assets/rap-vs-reality", tempDir)
                .replaceAll("part1.mp4", path.join(rapRealityPath, 'part1.mp4'))
                .replaceAll("part2.mp4", path.join(rapRealityPath, 'part2.mp4'))
                .replaceAll("part3.mp4", path.join(rapRealityPath, 'part3.mp4'))
                .replaceAll("part4.mp4", path.join(rapRealityPath, 'part4.mp4'))

                .replaceAll("overlay1.png", beforeSucksResizedPath)
                .replaceAll("overlay2.png", bigSucksResizedPath);

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
            await unlink(bigSucksResizedPath);
        } catch (error) {
            interaction.reply(`An error occurred: ${(error as any).message}`);
        }
    }
}