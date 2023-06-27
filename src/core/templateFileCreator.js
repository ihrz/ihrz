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

const fs = require('fs'),
    couleurmdr = require('colors'),
    axios = require('axios'),
    config = require(`${process.cwd()}/files/config`),
    logger = require(`${process.cwd()}/src/core/logger`);

INDEX_HTML_LINK = 'https://raw.githubusercontent.com/ihrz/ihrz/main/src/api/index.template.html'

async function makeHtmlFile() {
    // check if the file exists
    if (!fs.existsSync(`${process.cwd()}/src/api/index.html`)) {
        logger.warn(couleurmdr.red(`Error: File not found! (${process.cwd()}/src/api/index.html)`));
        const response = await axios.get(INDEX_HTML_LINK);
        const regex = /\/\*\*\/\"(.*)\"\/\*\*\//;
        const replaced = response.data.replace(regex, `/**/\"${config.api.oauth2Link}\"/**/`);

        const writeFilePromise = fs.promises.writeFile(
            `${process.cwd()}/src/api/index.html`,
            replaced,
            'utf8'
        );
        
        await Promise.all([writeFilePromise]);
        logger.log(couleurmdr.green(`Success: File created! (${process.cwd()}/src/api/index.html)`));
    }
};

module.exports.html = makeHtmlFile;