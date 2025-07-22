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

import { PallasDB } from 'pallas-db';

import { ConfigData } from '../../types/configDatad.js';
import logger from './logger.js';
import path from 'path';
import fs from 'fs';

let dbInstance: PallasDB | null = null;

export const tables = ['json', 'OWNER', 'OWNIHRZ', 'BLACKLIST', 'PREVNAMES', 'API', 'TEMP', 'SCHEDULE', 'USER_PROFIL', "AUTHRESTORE"];
export const readOnlyTables = ["AUTHRESTORE", "OWNIHRZ", 'API'];


export const overwriteLastLine = (message: string) => {
	process.stdout.write('\u001B[2K');
	process.stdout.write('\u001B[G');
	process.stdout.write(message);
};

export async function initializeDatabase(config: ConfigData): Promise<PallasDB> {
	if (dbInstance !== null) {
		return dbInstance;
	}

	let dbPromise: Promise<PallasDB>;
	const databasePath = `${process.cwd()}/src/files/`;

	if (!fs.existsSync(databasePath)) {
		fs.mkdirSync(databasePath, { recursive: true });
	}

	switch (config.database?.method) {
		case 'POSTGRES2':
			dbPromise = new Promise<PallasDB>(async (resolve, reject) => {
				resolve(new PallasDB({
					login: {
						host: config.database?.mySQL?.host!,
						username: config.database?.mySQL?.user!,
						password: config.database?.mySQL?.password!,
						database: config.database?.mySQL?.database!,
						port: config.database?.mySQL?.port,
					},
					dialect: (process.env.PALLASDB_SEQUELIZE_ALTERNATIVE_DIALECT as "postgres" || "mysql") || "postgres",
					tables
				}));
			});
			logger.log(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`.green);
			break;

		case 'POSTGRES_REDIS':
			dbPromise = new Promise<PallasDB>(async (resolve, reject) => {
				try {
					logger.log(`${config.console.emojis.HOST} >> Initializing PostgreSQL + Redis cache sync setup (with deduplication) !`.green);

					// Generate unique shard ID
					const shardId = process.env.SHARD_ID ||
						process.env.CLUSTER_ID ||
						`shard_${process.pid}`;

					const isMainShard = client.shard?.ids[0] === 0;

					// PostgreSQL database for persistence
					const postgresDb = new PallasDB({
						dialect: (process.env.PALLASDB_SEQUELIZE_ALTERNATIVE_DIALECT as "postgres" || "mysql") || "postgres",
						tables,
						login: {
							host: config.database?.mySQL?.host!,
							port: config.database?.mySQL?.port!,
							database: config.database?.mySQL?.database!,
							username: config.database?.mySQL?.user!,
							password: config.database?.mySQL?.password!,
						}
					});

					// Enhanced memory cache with Redis sync (ENABLED ON ALL SHARDS)
					const cacheDb = new PallasDB({
						dialect: "memory",
						tables,
						cacheSync: {
							enabled: true,
							shardId: `ihorizon_${shardId}`,
							channel: 'ihorizon_cache_sync',
							redis: {
								host: config.database?.redis?.host || 'localhost',
								port: config.database?.redis?.port || 6379,
								password: config.database?.redis?.password,
								db: config.database?.redis?.db || 1,
								retryDelayOnFailover: 100,
								maxRetriesPerRequest: 3,
								connectTimeout: 10000
							}
						},
						enableVerbose: process.env.DEV === "true" ? true : false
					});

					// Load initial data from PostgreSQL to cache
					// Load initial data from PostgreSQL to cache (ALL SHARDS)
					logger.log(`${config.console.emojis.HOST} >> Loading data from PostgreSQL to cache...`.yellow);
					for (const table of tables) {
						const cacheTable = cacheDb.table(table);
						const allData = await (postgresDb.table(table)).all();

						for (const { id, value } of allData) {
							await cacheTable.set(id, value);
						}
					}

					// PostgreSQL sync - ONLY ON MAIN SHARD
					if (isMainShard) {
						logger.log(`${config.console.emojis.HOST} >> Main shard: PostgreSQL sync ENABLED`.cyan);

						// Safe sync function with rate limiting
						let lastSyncTime = 0;
						let isSyncing = false;
						const syncToPostgres = async () => {
							const now = Date.now();

							// Rate limit sync operations (minimum 30 seconds between syncs)
							if (now - lastSyncTime < 30000) {
								return;
							}

							if (isSyncing) {
								return;
							}

							isSyncing = true;
							lastSyncTime = now;

							try {
								let syncCount = 0;
								for (const table of tables) {
									// Skip read-only tables for writes
									if (readOnlyTables.includes(table)) {
										// For read-only tables, sync FROM postgres TO cache
										const postgresTable = postgresDb.table(table);
										const cacheTable = cacheDb.table(table);
										const postgresData = await postgresTable.all();

										for (const { id, value } of postgresData) {
											await cacheTable.set(id, value);
										}
										continue;
									}

									const postgresTable = postgresDb.table(table);
									const cacheTable = cacheDb.table(table);

									const [postgresData, cacheData] = await Promise.all([
										postgresTable.all(),
										cacheTable.all()
									]);

									const postgresMap = new Map(postgresData.map(item => [item.id, item.value]));
									const cacheMap = new Map(cacheData.map(item => [item.id, item.value]));

									// Sync new/updated entries from cache to postgres (batched)
									const updates: Array<{ id: string, value: any }> = [];
									for (const [id, value] of cacheMap) {
										const postgresValue = postgresMap.get(id);
										if (!postgresValue || JSON.stringify(postgresValue) !== JSON.stringify(value)) {
											updates.push({ id, value });
										}
									}

									// Batch updates to reduce DB load
									for (const { id, value } of updates) {
										await postgresTable.set(id, value);
										syncCount++;
									}

									// Remove deleted entries from postgres (batched)
									const deletes: string[] = [];
									for (const id of postgresMap.keys()) {
										if (!cacheMap.has(id)) {
											deletes.push(id);
										}
									}

									for (const id of deletes) {
										await postgresTable.delete(id);
										syncCount++;
									}
								}

								if (syncCount > 0) {
									logger.log(`${config.console.emojis.HOST} >> [MAIN] [${new Date().toLocaleTimeString()}] Synced ${syncCount} changes to PostgreSQL`.green);
								}
							} catch (error) {
								logger.err(`[MAIN] Sync to PostgreSQL failed: ${error}`);
							} finally {
								isSyncing = false;
							}
						};


						setInterval(syncToPostgres, 60000 * 5); // Every 5 minutes

						// Attach postgres instance for manual operations
						(cacheDb as any)._postgresDb = postgresDb;
						(cacheDb as any).syncToPostgres = syncToPostgres;
					} else {
						logger.log(`${config.console.emojis.HOST} >> Secondary shard: PostgreSQL sync DISABLED (Redis sync only)`.yellow);

						// Still attach postgres instance for manual operations, but no auto-sync
						(cacheDb as any)._postgresDb = postgresDb;
					}

					const syncInfo = cacheDb.getCacheSyncInfo();
					logger.log(`${config.console.emojis.HOST} >> PostgreSQL + Redis cache ready! (Deduplication enabled)`.green);
					logger.log(`${config.console.emojis.HOST} >> Shard ID: ${syncInfo.shardId}, Channel: ${syncInfo.channel}`.cyan);

					if (isMainShard) {
						logger.log(`${config.console.emojis.HOST} >> Role: MAIN SHARD (PostgreSQL sync active)`.magenta);
					} else {
						logger.log(`${config.console.emojis.HOST} >> Role: SECONDARY SHARD (Redis sync only)`.blue);
					}

					resolve(cacheDb);
				} catch (error) {
					logger.err(`Failed to initialize PostgreSQL + Redis: ${error}`);
					reject(error);
				}
			});
			break;
		case 'CACHED_POSTGRES2':
			dbPromise = new Promise<PallasDB>(async (resolve, reject) => {
				logger.log(`${config.console.emojis.HOST} >> Initializing cached Postgres database setup (${config.database?.method}) !`.green);

				const postgresDb = new PallasDB({
					dialect: (process.env.PALLASDB_SEQUELIZE_ALTERNATIVE_DIALECT as "postgres" || "mysql") || "postgres",
					tables,
					login: {
						host: config.database?.mySQL?.host!,
						port: config.database?.mySQL?.port!,
						database: config.database?.mySQL?.database!,
						username: config.database?.mySQL?.user!,
						password: config.database?.mySQL?.password!,
					}
				});

				const memoryDB = new PallasDB({ dialect: "memory", tables, enableVerbose: process.env.DEV === "true" ? true : false });

				for (const table of tables) {
					const memoryTable = memoryDB.table(table);
					const allData = await (postgresDb.table(table)).all();

					for (const { id, value } of allData) {
						await memoryTable.set(id, value);
					}
				}

				const syncToPostgres = async () => {
					for (const table of tables) {
						const postgresTable = postgresDb.table(table);
						const memoryTable = memoryDB.table(table);

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

					overwriteLastLine(logger.returnLog(`${config.console.emojis.HOST} >> Synchronized memory database to Postgres !`));
				};

				setInterval(syncToPostgres, 60000 * 5);
				resolve(memoryDB);
			});
			break;

		case 'JSON':
			dbPromise = new Promise<PallasDB>((resolve, reject) => {
				logger.log(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`.green);
				resolve(new PallasDB({ dialect: "json", filePath: path.join(databasePath, "db.json"), tables }));
			});
			break;

		case 'SQLITE':
			dbPromise = new Promise<PallasDB>((resolve, reject) => {
				logger.log(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`.green);
				resolve(new PallasDB({ filePath: path.join(databasePath, 'db.sqlite'), tables, dialect: "mysql" }));
			});
			break;
		default:
			dbPromise = new Promise<PallasDB>((resolve, reject) => {
				logger.log(`${config.console.emojis.HOST} >> Connected to the database (${config.database?.method}) !`.green);
				resolve(new PallasDB({ filePath: path.join(databasePath, 'db.sqlite'), tables, dialect: "mysql" }));
			});
			break;
	}

	dbInstance = await dbPromise;

	// Setup graceful shutdown for Redis connections
	if (dbInstance && (dbInstance as any).getCacheSyncInfo) {
		const syncInfo = (dbInstance as any).getCacheSyncInfo();
		if (syncInfo?.enabled) {
			process.on('SIGINT', async () => {
				logger.log(`${config.console?.emojis?.HOST || '🔧'} >> Disconnecting Redis cache sync...`.yellow);
				try {
					await dbInstance!.disconnect();
					logger.log(`${config.console?.emojis?.HOST || '🔧'} >> Redis disconnected successfully`.green);
				} catch (error) {
					logger.err(`Failed to disconnect Redis: ${error}`);
				}
			});

			process.on('SIGTERM', async () => {
				logger.log(`${config.console?.emojis?.HOST || '🔧'} >> Disconnecting Redis cache sync...`.yellow);
				try {
					await dbInstance!.disconnect();
					logger.log(`${config.console?.emojis?.HOST || '🔧'} >> Redis disconnected successfully`.green);
				} catch (error) {
					logger.err(`Failed to disconnect Redis: ${error}`);
				}
			});
		}
	}

	return dbInstance;
}

export function getDatabaseInstance(): PallasDB {
	if (!dbInstance) {
		throw new Error('Database has not been initialized. Call initializeDatabase first.');
	}
	return dbInstance;
}

/**
 * Get cache synchronization info (only for POSTGRES_REDIS method)
 */
export function getCacheSyncInfo() {
	const db = getDatabaseInstance();
	if ((db as any).getCacheSyncInfo) {
		return (db as any).getCacheSyncInfo();
	}
	return { enabled: false };
}

/**
 * Force sync cache to PostgreSQL (only for POSTGRES_REDIS method)
 */
export async function forcePostgresSync() {
	const db = getDatabaseInstance();
	if ((db as any).syncToPostgres) {
		await (db as any).syncToPostgres();
		logger.log('Manual sync to PostgreSQL completed!'.green);
	}
}