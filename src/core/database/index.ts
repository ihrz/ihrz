/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { ConfigData } from '../../../types/configDatad.js';
import { DB } from './types.js';

import logger from '../logger.js';
import path from 'path';
import fs from 'fs';

import { Postgres } from './driver/postgres.js';
import { Horizon } from './driver/horizon.js';
import { Memory } from './driver/memory.js';
import { Sqlite } from './driver/sqlite.js';
import { Json } from './driver/json.js';
import { Redis } from './driver/redis.js';


let dbInstance: DB | null = null;

export const tables = ['json', 'OWNER', 'OWNIHRZ', 'BLACKLIST', 'PREVNAMES', 'API', 'TEMP', 'SCHEDULE', 'USER_PROFIL', "AUTHRESTORE"];
export const readOnlyTables = ["AUTHRESTORE", "OWNIHRZ", 'API'];
export const databasePath = `${process.cwd()}/src/files/`;

export const overwriteLastLine = (message: string) => {
	process.stdout.write('\u001B[2K');
	process.stdout.write('\u001B[G');
	process.stdout.write(message);
};

if (!fs.existsSync(databasePath)) {
	fs.mkdirSync(databasePath, { recursive: true });
}

export async function initializeDatabase(database: ConfigData["database"]): Promise<DB> {
	if (!database) throw new Error("invalid database object")
	if (dbInstance !== null) {
		return dbInstance;
	}

	if (database.method === "json") {
		dbInstance = new Json({
			filePath: path.join(databasePath, "db.json")
		});
	} else if (database.method === "sqlite") {
		dbInstance = new Sqlite({
			filePath: path.join(databasePath, "db.sqlite")
		});
	} else if (database.method === "memory") {
		dbInstance = new Memory();
	} else if (database.method === "postgresql") {
		dbInstance = new Postgres({
			connectionString: `postgres://${database.mySQL?.user}:${encodeURIComponent(database.mySQL?.password!)}@${database.mySQL?.host}:${database.mySQL?.port}/${database.mySQL?.database}`,
			table: tables[0]
		});
	} else if (database.method === "horizon") {
		dbInstance = new Horizon(`ws://${database?.horizon_db?.host}:${database?.horizon_db?.port}`, {
			login: database?.horizon_db?.login!,
			password: database?.horizon_db?.password!,
			enableVerboses: process.env.DEV === "true" ? true : false,
			tables
		});
	} else if (database.method === "cached_postgres") {
		logger.log(`${client.config.console.emojis.HOST} >> Initializing cached Postgres database setup (${database?.method}) !`.green);

		const postgresDb = new Postgres({
			connectionString: `postgres://${database.mySQL?.user}:${encodeURIComponent(database.mySQL?.password!)}@${database.mySQL?.host}:${database.mySQL?.port}/${database.mySQL?.database}`,
			table: tables[0]
		});

		dbInstance = new Memory();

		for (const table of tables) {
			const memoryTable = await dbInstance.table(table);
			const postgresTable = await postgresDb.table(table);
			const allData = await postgresTable.all();

			for (const { id, value } of allData) {
				await memoryTable.set(id, value);
			}
		}

		const syncToPostgres = async () => {
			for (const table of tables) {
				const postgresTable = await postgresDb.table(table);
				const memoryTable = await dbInstance!.table(table);

				const postgresData = await postgresTable.all();
				const memoryData = await memoryTable.all();

				const postgresMap = new Map(postgresData.map(item => [item.id, item.value]));
				const memoryMap = new Map(memoryData.map(item => [item.id, item.value]));

				for (const [id, value] of memoryMap) {
					const postgresValue = postgresMap.get(id);
					if (!postgresValue || JSON.stringify(postgresValue) !== JSON.stringify(value)) {
						try {
							if (readOnlyTables.includes(table)) {
								for (const { id, value } of postgresData) {
									await memoryTable.set(id, value);
								}
							} else {
								await postgresTable.set(id, value);
							}
						} catch (error) {
							logger.err(error as any);
						}
					}
				}

				if (!readOnlyTables.includes(table)) {
					for (const id of postgresMap.keys()) {
						if (!memoryMap.has(id)) {
							try {
								await postgresTable.delete(id);
							} catch (error) {
								logger.err(error as any);
							}
						}
					}
				}

				if (readOnlyTables.includes(table)) {
					for (const id of memoryMap.keys()) {
						if (!postgresMap.has(id)) {
							try {
								await memoryTable.delete(id);
							} catch (error) {
								logger.err(error as any);
							}
						}
					}
				}
			}

			overwriteLastLine(logger.returnLog(`${client.config.console.emojis.HOST} >> Synchronized memory database to Postgres !`));
		};

		setInterval(syncToPostgres, 60000 * 5);
	} else if (database.method === "redis") {
		dbInstance = new Redis({
			table: tables[0],
			connectionOptions: {
				connectionTimeout: 5000,
				autoReconnect: true
			}
		});
	} else {
		dbInstance = new Sqlite({
			filePath: path.join(databasePath, "db.sqlite")
		});
	}

	logger.log(`${client.config.console.emojis.HOST} >> Connected to the database (${client.config.database?.method}) !`.green);
	return dbInstance;
}

export function getDatabaseInstance(): DB {
	if (!dbInstance) {
		throw new Error('Database has not been initialized. Call initializeDatabase first.');
	}
	return dbInstance;
}