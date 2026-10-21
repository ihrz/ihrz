/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

import { ConfigData } from "../../../types/configDatad.js";
import { DB } from "./types.js";

import logger from "../logger.js";
import path from "path";
import fs from "node:fs";

import { Postgres } from "./driver/postgres.js";
import { Memory } from "./driver/memory.js";
import { Sqlite } from "./driver/sqlite.js";
import { Json } from "./driver/json.js";
import { HorizonDB } from "./driver/horizondb.js";

let dbInstance: DB | null = null;

export const tables = [
	"json",
	"owner",
	"blacklist",
	"prevnames",
	"api",
	"temp",
	"schedule",
	"user_profil",
	"authrestore",
	"metas",
	"giveaways",
	"backups"
];
export const readOnlyTables = ["authrestore", "api", "metas"];
export const databasePath = `${process.cwd()}/src/files/`;

export const overwriteLastLine = (message: string) => {
	process.stdout.write("\u001B[2K");
	process.stdout.write("\u001B[G");
	process.stdout.write(message);
};

if (!fs.existsSync(databasePath)) {
	fs.mkdirSync(databasePath, { recursive: true });
}
let isClient: boolean | null = null;

export async function initializeDatabase(
	database: ConfigData["database"]
): Promise<DB> {
	try {
		client;
		isClient = true;
	} catch {
		isClient = false;
	}

	if (!database) throw new Error("invalid database object");
	if (dbInstance !== null) {
		return dbInstance;
	}

	if (database.method === "json") {
		dbInstance = new Json({
			filePath: path.join(databasePath, "db.json")
		});
	} else if (database.method === "memory") {
		dbInstance = new Memory();
	} else if (database.method === "postgresql") {
		dbInstance = new Postgres({
			connectionString: `postgres://${database.mySQL?.user}:${encodeURIComponent(String(database.mySQL?.password))}@${database.mySQL?.host}:${database.mySQL?.port}/${database.mySQL?.database}`,
			table: tables[0]
		});
	} else if (database.method === "horizondb") {
		if (!database.horizon_db) {
			throw new Error(
				"horizon_db configuration is required when using the 'horizondb' database method"
			);
		}

		logger.log(
			`${isClient && client.config.console.emojis.HOST} >> Initializing HorizonDB database setup (${database?.method}) !`
				.green
		);

		dbInstance = new HorizonDB({
			url: `ws://${database.horizon_db.host}:${database.horizon_db.port}`,
			login: database.horizon_db.login,
			password: database.horizon_db.password,
			requestTimeoutMs: database.horizon_db.requestTimeoutMs,
			table: tables[0]
		});
	} else {
		dbInstance = new Sqlite({
			filePath: path.join(databasePath, "db.sqlite")
		});
	}

	logger.log(
		`${isClient && client.config.console.emojis.HOST} >> Connected to the database (${isClient && client.config.database?.method}) !`
			.green
	);
	return dbInstance;
}
