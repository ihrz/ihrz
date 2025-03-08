/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { JSONDriver, MemoryDriver, QuickDB } from 'quick.db';
import ansiEscapes from 'ansi-escapes';
import mysql from 'mysql2/promise.js';
import { PallasDB } from 'pallas-db';
import { setInterval } from 'timers';

import { ConfigData } from '../../types/configDatad.js';
import logger from './logger.js';
import fs from 'fs';
import { mkdir } from 'fs/promises';
import { SteganoDB } from 'stegano.db';

export type db = QuickDB<any> | PallasDB | SteganoDB;
let dbInstance: db | null = null;

const tables = ['json', 'OWNER', 'OWNIHRZ', 'BLACKLIST', 'PREVNAMES', 'API', 'TEMP', 'SCHEDULE', 'USER_PROFIL', "AUTHRESTORE"];
const readOnlyTables = ["AUTHRESTORE", "OWNIHRZ"];

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

export async function initializeDatabase(config: ConfigData): Promise<db> {
	if (dbInstance !== null) {
		return dbInstance;
	}

	let dbPromise: Promise<SteganoDB> | PallasDB | Promise<PallasDB>;
	let databasePath = `${process.cwd()}/src/files`;

	if (!fs.existsSync(databasePath)) {
		await mkdir(databasePath, { recursive: true });
	}

	dbPromise = new Promise<SteganoDB>((resolve, reject) => {
		logger.log(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`.green);
		resolve(new SteganoDB({ driver: "json", filePath: `${databasePath}/database.json` }));
	});

	dbInstance = await dbPromise

	return dbInstance;
};

export function getDatabaseInstance(): db {
	if (!dbInstance) {
		throw new Error('Database has not been initialized. Call initializeDatabase first.');
	}
	return dbInstance;
};