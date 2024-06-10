/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import { Emojis } from '../../../types/emojis';
import { fileURLToPath } from 'url';

import fs from 'node:fs';

import path from 'path';
import toml from 'toml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function emojis_(): Emojis {
    return toml.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'src', 'files', 'emojis.toml'), 'utf-8')) as Emojis
};

let emojis : Emojis;

function generateProgressBar(currentTimeMs: number, totalTimeMs: number): string {
    let currentTimeInSeconds = Math.floor(currentTimeMs / 1000);
    let totalTimeInSeconds = Math.floor(totalTimeMs / 1000);

    if (!emojis) {
        emojis = emojis_();
    }

    let progress = (currentTimeInSeconds / totalTimeInSeconds) * 100;

    let currentTimeFormatted = formatTime(currentTimeInSeconds);
    let totalTimeFormatted = formatTime(totalTimeInSeconds);

    let progressBarLength = 17;

    let dashesBefore = Math.floor((progressBarLength - 2) * (progress / 100));
    let dashesAfter = progressBarLength - dashesBefore - 2;

    let progressBar = `${currentTimeFormatted} ┃ ${`${emojis.icon.iHorizon_Bar}`.repeat(dashesBefore)}${emojis.icon.iHorizon_Pointer}${`${emojis.icon.iHorizon_Bar}`.repeat(dashesAfter)} ┃ ${totalTimeFormatted}`;

    return progressBar;
}

function formatTime(seconds: number): string {
    let minutes = Math.floor(seconds / 60);
    let remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export default generateProgressBar;