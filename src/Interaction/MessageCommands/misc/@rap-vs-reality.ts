/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import {
    ApplicationCommandOptionType,
    Message,
    Client,
} from 'discord.js';

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

import { LanguageData } from '../../../../types/languageData';
import { Command } from '../../../../types/command';
import { Option } from '../../../../types/option.js';
import { axios } from '../../../core/functions/axios.js';
import os from 'os';
import sharp from 'sharp';

const tempDir = path.join(os.tmpdir(), 'rap-vs-reality');
const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15 Mo

async function convertToPng(buffer: Buffer, filename: string): Promise<string> {
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    const outputPath = path.join(tempDir, `${filename}.png`);
    try {
        const image = sharp(buffer);
        const metadata = await image.metadata();

        const width = 1920;
        const height = 1080;
        const aspectRatio = metadata.width! / metadata.height!;

        let newWidth, newHeight;
        if (aspectRatio > (width / height)) {
            newWidth = width;
            newHeight = Math.round(width / aspectRatio);
        } else {
            newHeight = height;
            newWidth = Math.round(height * aspectRatio);
        }

        await image
            .resize(newWidth, newHeight)
            .toFormat('png')
            .toFile(outputPath);

        return outputPath;
    } catch (error) {
        throw error;
    }
}

async function adjustImageQuality(imagePath: string) {
    let stats = fs.statSync(imagePath);
    let quality = 100;

    while (stats.size > MAX_IMAGE_SIZE && quality > 10) {
        quality -= 10;
        await sharp(imagePath)
            .png({ quality })
            .toFile(imagePath);
        stats = fs.statSync(imagePath);
    }
}

async function resizeImage(inputPath: string, outputPath: string, width: number, height: number) {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    const aspectRatio = metadata.width! / metadata.height!;

    let newWidth, newHeight;
    if (aspectRatio > (width / height)) {
        newWidth = width;
        newHeight = Math.round(width / aspectRatio);
    } else {
        newHeight = height;
        newWidth = Math.round(height * aspectRatio);
    }

    await image
        .resize(newWidth, newHeight)
        .extend({
            top: Math.round((height - newHeight) / 2),
            bottom: Math.round((height - newHeight) / 2),
            left: Math.round((width - newWidth) / 2),
            right: Math.round((width - newWidth) / 2),
            background: { r: 0, g: 0, b: 0, alpha: 1 }
        })
        .toFile(outputPath);

    await adjustImageQuality(outputPath);
}

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
            required: true,
        },
        {
            name: "image2",
            description: "the after sucks",
            description_localizations: {
                "fr": "le screen après qu'il ce soit défoncé",
            },
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    thinking: false,
    category: 'misc',
    type: "PREFIX_IHORIZON_COMMAND",
    run: async (
        client: Client,
        interaction: Message<true>,
        lang: LanguageData,
        command: Command | Option | undefined,
        neededPerm,
        options?: string[],
    ) => {
        if (interaction.guild.preferredLocale !== 'fr') return;

        const beforeSucksUrl = client.method.string(options!, 0);
        const bigSucksUrl = client.method.string(options!, 1);

        if (!beforeSucksUrl || !bigSucksUrl) {
            return interaction.reply('Please provide two valid image URLs.');
        }

        try {
            const beforeSucksResponse = await axios.get(beforeSucksUrl, { responseType: 'arraybuffer' });
            const bigSucksResponse = await axios.get(bigSucksUrl, { responseType: 'arraybuffer' });

            const beforeSucksPngPath = await convertToPng(
                Buffer.from(beforeSucksResponse.data),
                `beforeSucks-${interaction.id}`
            );
            const bigSucksPngPath = await convertToPng(
                Buffer.from(bigSucksResponse.data),
                `bigSucks-${interaction.id}`
            );

            const beforeSucksResizedPath = path.join(tempDir, `beforeSucksResized-${interaction.id}.png`);
            const bigSucksResizedPath = path.join(tempDir, `bigSucksResized-${interaction.id}.png`);

            await resizeImage(beforeSucksPngPath, beforeSucksResizedPath, 1920, 1080);
            await resizeImage(bigSucksPngPath, bigSucksResizedPath, 1920, 1080);

            const rapRealityPath = path.join(process.cwd(), 'src', 'assets', 'rap-vs-reality');

            return new Promise((resolve, reject) => {
                const outputPath = path.join(tempDir, `merged_video_${Date.now()}.mp4`);

                ffmpeg()
                    .input(path.join(rapRealityPath, 'part1.mp4'))
                    .input(path.join(rapRealityPath, 'part2.mp4'))
                    .input(path.join(rapRealityPath, 'part3.mp4'))
                    .input(path.join(rapRealityPath, 'part4.mp4'))
                    .input(beforeSucksResizedPath)
                    .input(bigSucksResizedPath)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .outputOptions([
                        '-filter_complex',
                        `[1:v][4:v]overlay=0:0[part2_with_overlay];` +
                        `[3:v][5:v]overlay=0:0[part4_with_overlay];` +
                        `[0:v][0:a][part2_with_overlay][1:a][2:v][2:a][part4_with_overlay][3:a]concat=n=4:v=1:a=1[outv][outa]`,
                        '-map', '[outv]',
                        '-map', '[outa]'
                    ])
                    .output(outputPath)
                    .on('end', async () => {
                        try {
                            await interaction.reply({
                                files: [{
                                    attachment: outputPath,
                                    name: 'merged_video.mp4'
                                }]
                            });

                            fs.unlinkSync(outputPath);
                            resolve(null);
                        } catch (sendError) {
                            reject(sendError);
                        }
                    })
                    .on('error', (err) => {
                        interaction.reply(`Erreur FFmpeg : ${err.message}`);
                        reject(err);
                    })
                    .run();

            });
        } catch (error) {
            interaction.reply(`An error occurred: ${(error as any).message}`);
        }
    }
}