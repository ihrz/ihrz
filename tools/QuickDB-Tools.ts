import wait from '../src/core/functions/wait.js';
import config from '../src/files/config.js';
import logger from '../src/core/logger.js'
import './src/core/functions/colors.js';

import { QuickDB, MySQLDriver } from "quick.db";

const db_sqlite = new QuickDB({ filePath: `${process.cwd()}/db.sqlite` });

const mysql = new MySQLDriver({
    host: config.database?.mySQL?.host,
    port: config.database?.mySQL?.port,

    database: config.database?.mySQL?.database,

    user: config.database?.mySQL?.user,
    password: config.database?.mySQL?.password,
});

let tables_to_export = [
    'OWNIHRZ',
    'OWNER',
    'BLACKLIST',
    'json',
    'TEMP',
    'SCHEDULE',
    'PREVNAMES',
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