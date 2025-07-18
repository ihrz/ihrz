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

import Jimp from 'jimp';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { mkdir } from 'fs/promises';

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15 MB
export const tempDir = path.join(os.tmpdir(), 'media-manipulation');

export async function convertToPng(buffer: Buffer): Promise<Buffer> {
	if (!fs.existsSync(tempDir)) {
		await mkdir(tempDir, { recursive: true });
	}
	try {
		const image = await Jimp.read(buffer);
		const metadata = { width: image.getWidth(), height: image.getHeight() };

		const width = 1920;
		const height = 1080;
		const aspectRatio = metadata.width / metadata.height;

		let newWidth, newHeight;
		if (aspectRatio > (width / height)) {
			newWidth = width;
			newHeight = Math.round(width / aspectRatio);
		} else {
			newHeight = height;
			newWidth = Math.round(height * aspectRatio);
		}

		image.resize(newWidth, newHeight);

		return await image.getBufferAsync(Jimp.MIME_PNG);
	} catch (error) {
		throw error;
	}
}

export async function adjustImageQuality(imagePath: string) {
	let stats = fs.statSync(imagePath);
	let quality = 100;

	while (stats.size > MAX_IMAGE_SIZE && quality > 10) {
		quality -= 10;

		const image = await Jimp.read(imagePath);
		await image.quality(quality).writeAsync(imagePath);

		stats = fs.statSync(imagePath);
	}
}

export async function resizeImage(inputImage: Buffer, outputPath: string, width?: number, height?: number) {
	const image = await Jimp.read(inputImage);
	const metadata = { width: image.getWidth(), height: image.getHeight() };

	if (width && height) {
		const aspectRatio = metadata.width / metadata.height;

		let newWidth, newHeight;
		if (aspectRatio > (width / height)) {
			newWidth = width;
			newHeight = Math.round(width / aspectRatio);
		} else {
			newHeight = height;
			newWidth = Math.round(height * aspectRatio);
		}

		// Resize the image maintaining aspect ratio
		image.resize(newWidth, newHeight);

		// Create a new image with the target dimensions and black background
		const canvas = new Jimp(width, height, 0x000000FF); // Black background with full alpha

		// Calculate centering positions
		const x = Math.round((width - newWidth) / 2);
		const y = Math.round((height - newHeight) / 2);

		// Composite the resized image onto the canvas
		canvas.composite(image, x, y);

		// Write the final image
		await canvas.writeAsync(outputPath);
	} else {
		// If no dimensions specified, just write the original image
		await image.writeAsync(outputPath);
	}

	await adjustImageQuality(outputPath);

	return metadata;
}