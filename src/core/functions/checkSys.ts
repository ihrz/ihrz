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

import fs from 'fs';
import couleurmdr from 'colors';
import axios from 'axios';
import config from '../../files/config.js';
import logger from '../logger.js';

let INDEX_HTML_LINK: string = 'https://raw.githubusercontent.com/ihrz/ihrz/main/src/api/index.example.html';

export async function Html() {
    // check if the file exists
    if (!fs.existsSync(`${process.cwd()}/src/api/index.html`)) {
        logger.warn(couleurmdr.red(`Error: File not found! (${process.cwd()}/src/api/index.html)`));
        let response = await axios.get(INDEX_HTML_LINK);
        let regex = /\/\*\*\/\"(.*)\"\/\*\*\//;
        let replaced = response.data.replace(regex, `/**/\"${config.api.oauth2Link}\"/**/`);

        let writeFilePromise = fs.promises.writeFile(
            `${process.cwd()}/src/api/index.html`,
            replaced,
            'utf8'
        );

        await Promise.all([writeFilePromise]);
        logger.log(couleurmdr.green(`Success: File created! (${process.cwd()}/src/api/index.html)`));
    };
};