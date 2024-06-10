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

import { LanguageData } from '../../../types/languageData.js';
import { getDatabaseInstance } from '../database.js';

import yaml from 'js-yaml';
import fs from 'node:fs';

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LangsData {
    [lang: string]: LanguageData;
}

let LangsData: LangsData = {};
let database = getDatabaseInstance();

export default async function getLanguageData(arg: string): Promise<LanguageData> {
    let lang = await database.get(`${arg}.GUILD.LANG.lang`) as string;

    if (!lang) {
        lang = 'en-US';
    };

    let dat = LangsData[lang];

    if (!dat) {
        dat = yaml.load(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'src', 'lang', lang + '.yml'), 'utf8')) as LanguageData;
        LangsData[lang] = dat;
    };

    return dat;
};
