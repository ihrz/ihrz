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

import { QuickDB } from 'quick.db';
import { MongoDriver } from 'quickmongo';
import config from '../files/config.js';
import logger from './logger.js';
import couleurmdr from 'colors';
import * as proc from './errorManager.js';

let dbPromise: Promise<QuickDB>;

if (config.database.useSqlite) {
    dbPromise = new Promise<QuickDB>((resolve, reject) => {
        const db = new QuickDB({ filePath: `${process.cwd()}/src/files/db.sqlite` });
        logger.log(couleurmdr.green(`${config.console.emojis.HOST} >> Connected to the database (${config.database.useSqlite ? 'SQLite' : 'MongoDB'}) !`));
        resolve(db);
    });
} else {
    dbPromise = new Promise<QuickDB>(async (resolve, reject) => {
        let driver = new MongoDriver(config.database.mongoDb);

        try {
            await driver.connect();
            logger.log(couleurmdr.green(`${config.console.emojis.HOST} >> Connected to the database (${config.database.useSqlite ? 'SQLite' : 'MongoDB'}) !`));
            const db = new QuickDB({ driver });
            resolve(db);
            proc.exit(driver);
        } catch (error) {
            logger.err(couleurmdr.red(`${config.console.emojis.ERROR} >> ${(error as string).split("\n")[0]}`));
            logger.err(couleurmdr.red(`${config.console.emojis.ERROR} >> Database is unreachable (${config.database.useSqlite ? 'SQLite' : 'MongoDB'}) !`));
            logger.err(couleurmdr.red(`${config.console.emojis.ERROR} >> Please use a different database than ${config.database.useSqlite ? 'SQLite' : 'MongoDB'} !`));
            logger.err(couleurmdr.red(`${config.console.emojis.ERROR} >> in the /src/files/config.ts at: 'database.useSqlite'.`));

            logger.err(couleurmdr.bgRed(`Exiting the code...`));

            process.exit();
        }
    });
}

export default dbPromise;