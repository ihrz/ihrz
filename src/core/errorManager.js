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
            logger.err(`${config.console.emojis.ERROR} >> Error detected`.red),
                logger.err(`${config.console.emojis.OK} >> Save in the logs`.gray);

            let filesPath = process.cwd() + '/files/.err_logs';

            CreateFiles = fs.createWriteStream(filesPath, { flags: 'a' });

            let i = `[${date.format((new Date()), 'DD/MM/YYYY HH:mm:ss')}]\n${err.stack || err.message}\r\n`;

            return CreateFiles.write(i);
        };

        logger.err(err.stack || err.message);
    });
};

function exit(driver) {
    let dbProtocolName = config.database.useSqlite ? 'SQLite' : 'MongoDB';

    const exec = async () => await logger.warn(`${config.console.emojis.ERROR} >> Database connection are closed (${dbProtocolName})!`) && await driver.close();

    process.on('exit', async () => { await exec(); return process.exit(1); });
    process.on('abort', async () => { await exec(); return process.exit(1); });
    process.on('SIGINT', async () => { await exec(); return process.exit(1); });
};

module.exports.exit = exit;
module.exports.uncaughtExceptionHandler = uncaughtExceptionHandler;