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

import { readFileSync, rmSync, writeFileSync } from "fs";
import { execSync } from "child_process";

import { tempDir } from "./mediaManipulation.js";
import path from "path";

class KdenLive {
    constructor() {
    }

    async open(projectPath: string) {
        let projectXML = readFileSync(projectPath, 'utf8');
        return projectXML;
    }

    async tempSave(projectData: string): Promise<string> {
        let savedFile = path.join(tempDir, Date.now() + ".kdenlive");
        let updatedXML = projectData;

        writeFileSync(savedFile, updatedXML, 'utf8');
        return savedFile;
    }

    async export(projectPath: string) {
        let exportPath = path.join(tempDir, `merged_video_${Date.now()}.mp4`);
        // Use xvfb-run for execute melt in an virtual X11 environnement
        execSync(`xvfb-run -a melt -audio-samplerate 44100 ${projectPath} -consumer avformat:${exportPath}`);
        rmSync(projectPath);
        return exportPath;
    }
}

export {
    KdenLive
}