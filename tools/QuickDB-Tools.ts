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

import wait from '../src/core/functions/wait.js';
import logger from '../src/core/logger.js'
import '../src/core/functions/colors.js';

import { QuickDB, MySQLDriver } from "quick.db";

const db_sqlite = new QuickDB({ filePath: `${process.cwd()}/db.sqlite` });

const mysql = new MySQLDriver({
    host: 'database host',
    port: 3336,

    database: 'db',

    user: 'user',
    password: 'password',
});

let tables_to_export = [
    'OWNIHRZ',
    'OWNER',
    'BLACKLIST',
    'json',
    'TEMP',
    'SCHEDULE',
    'PREVNAMES',
    'API'
];

logger.legacy("[*] iHorizon Discord Bot (https://github.com/ihrz/ihrz).".gray());
logger.legacy("[*] Warning: iHorizon Discord bot is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 2.0.".gray());
logger.legacy("[*] Please respect the terms of this license. Learn more at: https://creativecommons.org/licenses/by-nc-sa/2.0".gray());
logger.legacy(`Table(s) to export: ${tables_to_export.length}`.green());

const time_before = Date.now();

(async () => {
    await wait(1000);
    await mysql.connect();

    const db_mysql = new QuickDB({ driver: mysql });

    for (let table of tables_to_export) {
        var i = 0;

        await wait(1000);

        // Creating the table if doesn't exist

        let table_mysql = db_mysql.table(table);

        logger.legacy(`[-]`.gray() + ` Starting to export ${table} table !`.white());

        let table_sqlite = db_sqlite.table(table);

        let content = await table_sqlite.all();

        for (const item of content) {
            logger.legacy(`[+]`.green() + ` (line:${i}) <${table}> `.gray() + `${item.id}`.blue());

            await table_mysql.set(item.id, item.value);
            i++;
        };

        logger.legacy(`[-]`.gray() + ` Ending of the export ${table} table !`.white());

        await wait(1000);
    }

    logger.legacy(`[i] `.blue() + `Exporting ${tables_to_export.length} tables in ${Date.now() - time_before}ms. Done!`.gray());
    logger.legacy(`[O] `.red() + `The program was succefully done. Exiting...`.bgRed());
    process.kill(0);
})();