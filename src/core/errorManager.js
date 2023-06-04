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
    date = require('date-and-time'),
    config = require(`${process.cwd()}/files/config.js`),
    logger = require("./logger");

function uncaughtExceptionHandler() {

    process.on('uncaughtException', function (err) {
        if (!config.core.devMode) {
            logger.err("💥 >> Error detected".red), logger.err("📜 >> Save in the logs".gray);

            let filesPath = process.cwd() + '/files/logs/crash/' + date.format((new Date()), 'DD.MM.YYYY HH;mm;ss') + '.txt';

            CreateFiles = fs.createWriteStream(filesPath, {flags: 'a'});

            let i = `${config.core.asciicrash}\n${err.stack || err.message}\r\n`;

            return CreateFiles.write(i);
        };

        console.error(err.stack || err.message);
    });
};

module.exports.uncaughtExceptionHandler = uncaughtExceptionHandler;