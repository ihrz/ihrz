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

import { exec } from "child_process";
import { promisify } from "util";
import { tempDir } from "./mediaManipulation.js";
import path from "path";
import { readFile, rm, writeFile } from "fs/promises";

const execAsync = promisify(exec);

class KdenLive {
	constructor() { }

	async open(projectPath: string): Promise<string> {
		return readFile(projectPath, 'utf8');
	}

	async tempSave(projectData: string): Promise<string> {
		const savedFile = path.join(tempDir, `${Date.now()}.kdenlive`);
		await writeFile(savedFile, projectData, 'utf8');
		return savedFile;
	}

	async export(projectPath: string): Promise<string> {
		const exportPath = path.join(tempDir, `merged_video_${Date.now()}.mp4`);
		try {
			const command = `xvfb-run -a melt -audio-samplerate 44100 ${projectPath} -consumer avformat:${exportPath}`;
			await execAsync(command);
			await rm(projectPath);
			return exportPath;
		} catch (error) {
			throw error;
		}
	}
}

export {
	KdenLive
};