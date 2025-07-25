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

import { HorizonDatabaseClient } from './driver/horizon.js';
import { Postgres } from './driver/postgres.js';
import { Memory } from './driver/memory.js';
import { Sqlite } from './driver/sqlite.js';
import { Json } from './driver/json.js';


let dbInstance: DB | null = null;

export const tables = ['json', 'OWNER', 'OWNIHRZ', 'BLACKLIST', 'PREVNAMES', 'API', 'TEMP', 'SCHEDULE', 'USER_PROFIL', "AUTHRESTORE"];
export const readOnlyTables = ["AUTHRESTORE", "OWNIHRZ", 'API'];
export const databasePath = `${process.cwd()}/src/files/`;

if (!fs.existsSync(databasePath)) {
	fs.mkdirSync(databasePath, { recursive: true });
}

// export const overwriteLastLine = (message: string) => {
// 	process.stdout.write('\u001B[2K');
// 	process.stdout.write('\u001B[G');
// 	process.stdout.write(message);
// };

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
			table: "json"
		});
	} else if (database.method === "horizon") {
		dbInstance = new HorizonDatabaseClient(`ws://${database?.horizon_db?.host}:${database?.horizon_db?.port}`, {
			login: database?.horizon_db?.login!,
			password: database?.horizon_db?.password!,
			enableVerboses: process.env.DEV === "true" ? true : false,
			tables
		});

		await dbInstance.waitUntilReady();
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