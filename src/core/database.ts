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

import { ConfigData } from '../../types/configDatad.js';

import { JSONDriver, MySQLDriver, QuickDB } from 'quick.db';
import { MongoDriver } from 'quickmongo';
import * as proc from './modules/errorManager.js';
import logger from './logger.js';
import fs from 'fs';

let dbInstance: QuickDB<any>;

export const initializeDatabase = async (config: ConfigData) => {
    let dbPromise;
    let sqlitePath = `${process.cwd()}/src/files`;

    if (!fs.existsSync(sqlitePath)) {
        fs.mkdirSync(sqlitePath, { recursive: true });
    }

    switch (config.database?.method) {
        case 'MONGO_DB':
            dbPromise = new Promise<QuickDB>(async (resolve, reject) => {
                let driver = new MongoDriver(config.database?.mongoDb!);

                try {
                    await driver.connect();
                    logger.log(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`);
                    resolve(new QuickDB({ driver }));
                    proc.exit(driver, config);
                } catch (error: any) {
                    logger.err(`${config.console.emojis.ERROR} >> ${error.toString().split('\n')[0]}`.red());
                    logger.err(`${config.console.emojis.ERROR} >> Database is unreachable (${config.database?.method}) !`.red());
                    logger.err(`${config.console.emojis.ERROR} >> Please use a different database than ${config.database?.method}) !`.red());
                    logger.err(`${config.console.emojis.ERROR} >> in the /src/files/config.ts at: 'database.method'.`.red());
                    logger.err(`Exiting the code...`.bgRed());

                    process.kill(0);
                }
            });
            break;
        case 'JSON':
            dbPromise = new Promise<QuickDB>((resolve, reject) => {
                logger.log(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`.green());
                resolve(new QuickDB({ driver: new JSONDriver() }));
            });
            break;
        case 'MYSQL':
            dbPromise = new Promise<QuickDB>(async (resolve, reject) => {
                logger.log(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`.green());

                let mysql = new MySQLDriver({
                    host: config.database?.mySQL?.host,
                    user: config.database?.mySQL?.user,
                    password: config.database?.mySQL?.password,
                    database: config.database?.mySQL?.database,
                    port: config.database?.mySQL?.port,
                });

                await mysql.connect();

                let db = new QuickDB({ driver: mysql });
                db.table('OWNER'); db.table('OWNIHRZ'); db.table('BLACKLIST'); db.table('PREVNAMES'); db.table('API'); db.table('TEMP'); db.table('SCHEDULE'); db.table('USER_PROFIL');
                resolve(db);
            });
            break;
        case 'SQLITE':
            dbPromise = new Promise<QuickDB>((resolve, reject) => {
                logger.log(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`);
                resolve(new QuickDB({ filePath: sqlitePath + '/db.sqlite' }));
            });
            break;
        default:
            dbPromise = new Promise<QuickDB>((resolve, reject) => {
                logger.log(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`.green());
                resolve(new QuickDB({ filePath: sqlitePath + '/db.sqlite' }));
            });
            break;
    }

    dbInstance = await dbPromise;
    return dbInstance;
};

export const getDatabaseInstance = (): QuickDB<any> => {
    if (!dbInstance) {
        throw new Error('Database has not been initialized. Call initializeDatabaseWithConfig first.');
    }
    return dbInstance;
};