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

import { JSONDriver, MySQLDriver, QuickDB } from 'quick.db';
import { MongoDriver } from 'quickmongo';
import config from '../files/config.js';
import logger from './logger.js';
import couleurmdr from 'colors';
import * as proc from './modules/errorManager.js';

let dbPromise: Promise<QuickDB> | undefined = undefined;

switch (config.database?.method) {
    case 'MONGO_DB':
        dbPromise = new Promise<QuickDB>(async (resolve, reject) => {
            let driver = new MongoDriver(config.database?.mongoDb as string);

            try {
                await driver.connect();
                logger.log((`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`));
                resolve(new QuickDB({ driver }));
                proc.exit(driver);
            } catch (error) {
                logger.err(couleurmdr.red(`${config.console.emojis.ERROR} >> ${(error as string).toString().split('\n')[0]}`));
                logger.err(couleurmdr.red(`${config.console.emojis.ERROR} >> Database is unreachable (${config.database?.method}) !`));
                logger.err(couleurmdr.red(`${config.console.emojis.ERROR} >> Please use a different database than ${config.database?.method} !`));
                logger.err(couleurmdr.red(`${config.console.emojis.ERROR} >> in the /src/files/config.ts at: 'database.method'.`));

                logger.err(couleurmdr.bgRed(`Exiting the code...`));

                process.exit();
            }
        });
        break;
    case 'JSON':
        dbPromise = new Promise<QuickDB>((resolve, reject) => {
            logger.log(couleurmdr.green(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`));
            resolve(new QuickDB({ driver: new JSONDriver() }));
        });
        break;
    case 'MYSQL':
        dbPromise = new Promise<QuickDB>(async (resolve, reject) => {
            logger.log(couleurmdr.green(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`));
            
            let mysql = new MySQLDriver({
                host: config.database?.mySQL?.host,
                user: config.database?.mySQL?.user,
                password: config.database?.mySQL?.password,
                database: config.database?.mySQL?.database,
                port: config.database?.mySQL?.port,
            });

            await mysql.connect();
            resolve(
                new QuickDB({
                    driver: mysql
                })
            );
        });
        break;
    case 'SQLITE':
        dbPromise = new Promise<QuickDB>((resolve, reject) => {
            logger.log(couleurmdr.green(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`));
            resolve(new QuickDB({ filePath: `${process.cwd()}/src/files/db.sqlite` }));
        });
        break;
    default:
        dbPromise = new Promise<QuickDB>((resolve, reject) => {
            logger.log(couleurmdr.green(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`));
            resolve(new QuickDB({ filePath: `${process.cwd()}/src/files/db.sqlite` }));
        })
        break;
}

export default dbPromise as Promise<QuickDB<any>>
