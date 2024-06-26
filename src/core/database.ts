/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import { JSONDriver, MemoryDriver, MySQLDriver, QuickDB } from 'quick.db';
import { MongoDriver } from 'quickmongo';
import ansiEscapes from 'ansi-escapes';
import mysql from 'mysql2/promise.js';
import { setInterval } from 'timers';

import { ConfigData } from '../../types/configDatad.js';
import * as proc from './modules/errorManager.js';
import logger from './logger.js';
import fs from 'fs';
let dbInstance: QuickDB<any>;

const tables = ['OWNER', 'OWNIHRZ', 'BLACKLIST', 'PREVNAMES', 'API', 'TEMP', 'SCHEDULE', 'USER_PROFIL', 'json'];

async function isReachable(database: ConfigData['database']): Promise<boolean> {
    let connection;
    try {
        connection = await mysql.createConnection(database?.mySQL!);
        await connection.end();
        return true;
    } catch (error) {
        return false;
    } finally {
        if (connection && connection.end) {
            await connection.end();
        }
    }
};

const overwriteLastLine = (message: string) => {
    process.stdout.write(ansiEscapes.eraseLine);
    process.stdout.write(ansiEscapes.cursorLeft);
    process.stdout.write(message);
};

export const initializeDatabase = async (config: ConfigData) => {
    let dbPromise: Promise<QuickDB<any>>;
    let sqlitePath = `${process.cwd()}/src/files`;

    if (!fs.existsSync(sqlitePath)) {
        fs.mkdirSync(sqlitePath, { recursive: true });
    }

    switch (config.database?.method) {
        case 'MONGO_DB':
            dbPromise = new Promise<QuickDB>(async (resolve, reject) => {
                const driver = new MongoDriver(config.database?.mongoDb!);

                try {
                    await driver.connect();
                    logger.log(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`);
                    resolve(new QuickDB({ driver }));
                    proc.exit(driver, config);
                } catch (error: any) {
                    logger.err(`${config.console.emojis.ERROR} >> ${error.toString().split('\n')[0]}`.red);
                    logger.err(`${config.console.emojis.ERROR} >> Database is unreachable (${config.database?.method}) !`.red);
                    logger.err(`${config.console.emojis.ERROR} >> Please use a different database than ${config.database?.method}) !`.red);
                    logger.err(`${config.console.emojis.ERROR} >> in the /src/files/config.ts at: 'database.method'.`.red);
                    logger.err(`Exiting the code...`.bgRed);

                    process.kill(0);
                }
            });
            break;
        case 'JSON':
            dbPromise = new Promise<QuickDB>((resolve, reject) => {
                logger.log(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`.green);
                resolve(new QuickDB({ driver: new JSONDriver() }));
            });
            break;
        case 'MYSQL':
            dbPromise = new Promise<QuickDB>(async (resolve, reject) => {
                const connectionAvailable = await isReachable(config.database);

                if (!connectionAvailable) {
                    console.error(`${config.console.emojis.ERROR} >> Failed to connect to the MySQL database`);
                    process.exit(1)
                };

                logger.log(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`.green);

                const mysql = new MySQLDriver({
                    host: config.database?.mySQL?.host,
                    user: config.database?.mySQL?.user,
                    password: config.database?.mySQL?.password,
                    database: config.database?.mySQL?.database,
                    port: config.database?.mySQL?.port,
                });

                await mysql.connect();

                const db = new QuickDB({ driver: mysql });
                for (let table of tables) {
                    db.table(table);
                };
                resolve(db);
            });
            break;
        case 'SQLITE':
            dbPromise = new Promise<QuickDB>((resolve, reject) => {
                logger.log(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`);
                resolve(new QuickDB({ filePath: sqlitePath + '/db.sqlite' }));
            });
            break;
        case 'CACHED_SQL':
            dbPromise = new Promise<QuickDB>(async (resolve, reject) => {
                const connectionAvailable = await isReachable(config.database);

                if (!connectionAvailable) {
                    console.error(`${config.console.emojis.ERROR} >> Failed to connect to the MySQL database`);
                    process.kill(1)
                };

                logger.log(`${config.console.emojis.HOST} >> Initializing cached database setup (${config.database?.method}) !`.green);

                const mysql = new MySQLDriver({
                    host: config.database?.mySQL?.host,
                    user: config.database?.mySQL?.user,
                    password: config.database?.mySQL?.password,
                    database: config.database?.mySQL?.database,
                    port: config.database?.mySQL?.port,
                });

                await mysql.connect();

                const mysqlDb = new QuickDB({ driver: mysql });
                const memoryDB = new QuickDB({ driver: new MemoryDriver() });

                for (const table of tables) {
                    const memoryTable = memoryDB.table(table);
                    const allData = await (mysqlDb.table(table)).all();
                    for (const { id, value } of allData) {
                        await memoryTable.set(id, value);
                    }
                }

                const syncToMySQL = async () => {
                    for (const table of tables) {
                        const mysqlTable = mysqlDb.table(table);
                        const memoryTable = memoryDB.table(table);
                        const allData = await memoryTable.all();
                        for (const { id, value } of allData) {
                            await mysqlTable.set(id, value);
                        }
                    }

                    overwriteLastLine(logger.returnLog(`${config.console.emojis.HOST} >> Synchronized memory database to MySQL`))
                };

                process.on('SIGINT', async () => {
                    await syncToMySQL();
                    process.exit();
                });

                process.on('exit', async (code) => {
                    if (code !== 0) {
                        await syncToMySQL()
                    }
                });
                setInterval(syncToMySQL, 45000);
                resolve(memoryDB);
            });
            break;
        default:
            dbPromise = new Promise<QuickDB>((resolve, reject) => {
                logger.log(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`.green);
                resolve(new QuickDB({ filePath: sqlitePath + '/db.sqlite' }));
            });
            break;
    }

    dbInstance = await dbPromise;
    return dbInstance;
};

export const getDatabaseInstance = (): QuickDB<any> => {
    if (!dbInstance) {
        throw new Error('Database has not been initialized. Call initializeDatabase first.');
    }
    return dbInstance;
};