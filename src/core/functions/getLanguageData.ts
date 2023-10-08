/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

import db from '../functions/DatabaseModel';
import yaml from 'js-yaml';
import fs from 'fs';

interface LangsData {
    [lang: string]: any;
}

let LangsData: LangsData = {};

async function getLanguageData(arg: string): Promise<any> {
    let fetched = await db.get(`${arg}.GUILD.LANG`);
    let lang: string = '';

    if (!fetched) {
        lang = "en-US";
    } else {
        lang = fetched.lang;
    };

    let dat = LangsData[lang];

    if (!dat) {
        dat = yaml.load(fs.readFileSync(`${process.cwd()}/src/lang/${lang}.yml`, 'utf8'));
        LangsData[lang] = dat;
    };

    return dat;
};

export = getLanguageData;