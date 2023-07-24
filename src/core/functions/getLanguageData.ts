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

import yaml from 'js-yaml';
import * as db from '../functions/DatabaseModel';
import fs from 'fs';

async function getLanguageData(arg: string):Promise<any>{
    let fetched = await db.DataBaseModel({ id: db.Get, key: `${arg}.GUILD.LANG` });
    if (!fetched) {
        return yaml.load(fs.readFileSync(`${process.cwd()}/src/lang/en-US.yml`, 'utf8'));
    };
    return await yaml.load(fs.readFileSync(`${process.cwd()}/src/lang/${fetched.lang}.yml`, 'utf8'));
};

module.exports = getLanguageData;