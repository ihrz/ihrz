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

import Jimp from 'jimp';
import { randomInt } from 'crypto';

async function captcha(width: number, height: number): Promise<{ code: string; image: string }> {
    let captchaCode = generateRandomCode();
    let image = new Jimp(width, height, '#ffffff');

    for (let i = 0; i < captchaCode.length; i++) {
        let letterX = 50 + i * 30;
        let letterY = 50;
        let letterImage = await createLetterImage(captchaCode[i]);

        letterImage.scan(0, 0, letterImage.bitmap.width, letterImage.bitmap.height, function (x, y, idx) {
            let newX = x + Math.sin(y / 36) * 5;
            let newY = y + Math.cos(x / 26) * 5;
            let newIdx = letterImage.getPixelIndex(newX, newY);
            for (let j = 0; j < 4; j++) {
                letterImage.bitmap.data[idx + j] = letterImage.bitmap.data[newIdx + j];
            }
        });

        image.composite(letterImage, letterX, letterY);
    };

    image.blur(1);

    return { code: captchaCode, image: await image.getBase64Async(Jimp.MIME_PNG) };
}

function generateRandomCode(): string {
    let characters = 'ABCDEFGHIKLMNOPQRSTUVWXYZabcdefghiklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        let randomIndex = randomInt(0, characters.length);
        code += characters.charAt(randomIndex);
    }
    return code;
}

async function createLetterImage(letter: string): Promise<Jimp> {
    let image =  new Jimp(30, 50, '#ffffff');
    let font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    return image.print(font, 0, 0, letter);
}

export default captcha;