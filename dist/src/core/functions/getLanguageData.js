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
import { readFile } from 'node:fs/promises';
import database from './DatabaseModel.js';
import yaml from 'js-yaml';
import { getClient } from '../core.js';
let LangsData = {};
let cached_client = getClient();
export default async function getLanguageData(arg) {
    let lang = await database.get(`${arg}.GUILD.LANG.lang`);
    if (!lang) {
        lang = 'fr-FR';
    }
    ;
    let dat = LangsData[lang];
    if (!dat) {
        let cleaned_username = cached_client.user?.username.replace("\"", "");
        dat = yaml.load((await readFile(process.cwd() + "/src/lang/" + lang + ".yml", 'utf8'))
            .replaceAll('iHorizon ', cleaned_username + " ")
            .replaceAll(' iHorizon', " " + cleaned_username)
            .replaceAll('iHorizon.', cleaned_username + "."));
        LangsData[lang] = dat;
    }
    ;
    return dat;
}
;
