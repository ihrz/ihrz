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
import { DB, MultiDB } from "./types.js";

import logger from "../logger.js";
import path from "path";
import fs from "node:fs";

import { Postgres } from "./driver/postgres.js";
import { Memory } from "./driver/memory.js";
import { Sqlite } from "./driver/sqlite.js";
import { Json } from "./driver/json.js";

let dbInstance: MultiDB | null = null;

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
try {
	client;
	let isClient = true;
} catch {
	isClient = false;
}

export async function initializeDatabase(
	database: ConfigData["database"]
): Promise<MultiDB> {
	if (!database) throw new Error("invalid database object");
	if (dbInstance !== null) {
		return dbInstance;
	}

	if (database.method === "json") {
		dbInstance = {
			x: new Json({
				filePath: path.join(databasePath, "db.json")
			})
		};
	} else if (database.method === "memory") {
		dbInstance = {
			x: new Memory()
		};
	} else if (database.method === "postgresql") {
		dbInstance = {
			x: new Postgres({
				connectionString: `postgres://${database.mySQL?.[0].user}:${encodeURIComponent(database.mySQL?.[0].password!)}@${database.mySQL?.[0].host}:${database.mySQL?.[0].port}/${database.mySQL?.[0].database}`,
				table: tables[0]
			})
		};
	} else if (database.method === "cached_postgres") {
		logger.log(
			`${isClient ?? client.config.console.emojis.HOST} >> Initializing cached Postgres database setup (${database?.method}) !`
				.green
		);

		dbInstance = {
			x: new Memory(),
			og: new Postgres({
				connectionString: `postgres://${database.mySQL?.[0].user}:${encodeURIComponent(database.mySQL?.[0].password!)}@${database.mySQL?.[0].host}:${database.mySQL?.[0].port}/${database.mySQL?.[0].database}`,
				table: tables[0]
			})
		};

		if (database.mySQL?.[1]) {
			dbInstance.y = new Postgres({
				connectionString: `postgres://${database.mySQL?.[1].user}:${encodeURIComponent(database.mySQL?.[1].password!)}@${database.mySQL?.[1].host}:${database.mySQL?.[1].port}/${database.mySQL?.[1].database}`,
				table: tables[9] // Chose metas table at default
			});
			logger.log(
				`${isClient ?? client.config.console.emojis.LOAD} >> Initializing bi-separated postgres database.`
			);
		}

		if (dbInstance.y) {
			// do bi-separated db stuff

			/** Cache the json table for first database */
			const postgresTable = await dbInstance.og!.table("json");
			const memoryTable = await dbInstance.x.table("json");
			const allData = await postgresTable.all();

			for (const { id, value } of allData) {
				/** Only needed to cache the guilds record which is in the shard (avoid to much useless storing) */
				if (client?.inShard(id)) await memoryTable.set(id, value);
			}
		} else /* Else, only one postgres. Load all tables in memory */ {
			for (const table of tables) {
				const postgresTable = await dbInstance.og!.table(table);
				const memoryTable = await dbInstance.x.table(table);
				const allData = await postgresTable.all();

				for (const { id, value } of allData) {
					await memoryTable.set(id, value);
				}
			}
		}

		setInterval(syncToPostgres, 60000 * 5);
	} else {
		dbInstance = {
			x: new Sqlite({
				filePath: path.join(databasePath, "db.sqlite")
			})
		};
	}

	logger.log(
		`${isClient ?? client.config.console.emojis.HOST} >> Connected to the database (${isClient ?? client.config.database?.method}) !`
			.green
	);
	return dbInstance;
}

const syncToPostgres = async () => {
	if (!dbInstance) process.exit(1);
	let _tables = dbInstance.y ? ["json"] : tables;

	for (const table of _tables) {
		const postgresTable = await dbInstance.og!.table(table);
		const memoryTable = await dbInstance!.x.table(table);

		const postgresData = await postgresTable.all();
		const memoryData = await memoryTable.all();

		const postgresMap = new Map(
			postgresData.map((item) => [item.id, item.value])
		);
		const memoryMap = new Map(
			memoryData.map((item) => [item.id, item.value])
		);

		for (const [id, value] of memoryMap) {
			const postgresValue = postgresMap.get(id);
			if (
				!postgresValue ||
				JSON.stringify(postgresValue) !== JSON.stringify(value)
			) {
				try {
					if (readOnlyTables.includes(table)) {
						for (const { id, value } of postgresData) {
							await memoryTable.set(id, value);
						}
					} else {
						if (table === "json") {
							if (client?.inShard(id))
								await postgresTable.set(id, value);
						} else {
							await postgresTable.set(id, value);
						}
					}
				} catch (error) {
					logger.err(error);
				}
			}
		}

		if (!readOnlyTables.includes(table)) {
			for (const id of postgresMap.keys()) {
				if (!memoryMap.has(id)) {
					try {
						if (table === "json") {
							if (client.inShard(id))
								await postgresTable.delete(id);
						} else {
							await postgresTable.delete(id);
						}
					} catch (error) {
						logger.err(error);
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
						logger.err(error);
					}
				}
			}
		}
	}

	overwriteLastLine(
		logger.returnLog(
			`${client.config.console.emojis.HOST} >> Synchronized memory database to Postgres !`
		)
	);
};
