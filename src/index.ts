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

function envBool(value: any): boolean {
	return value === "1" || value?.toLowerCase() === "true";
}

import './core/functions/colors.js';

import getToken from './core/functions/getToken.js';
import config from './files/config.js';
import logger from './core/logger.js';

import { ShardingManager } from 'discord.js';
import { config as conf } from 'dotenv';

import { overwriteLastLine, readOnlyTables, tables } from './core/database.js';
import { PallasDB } from 'pallas-db';

conf({ debug: false });

const _token = await getToken();

/**
 * Enables the **Redis multi-shard cache** system for iHorizon.
 *
 * ---
 *
 * In a sharded architecture (multi-process Discord bot),
 * each shard is an independent Node.js process with its own memory.
 * This creates a **major synchronization issue** for data:
 *
 * - Each shard has its own in-memory cache (via PallasDB)
 * - Data is only synchronized to PostgreSQL every few minutes
 * - This causes **inconsistencies** (e.g., backups created on one shard are invisible to others)
 *
 * ---
 *
 * The environment variable `SHOULD_USE_REDIS_MULTI_SHARD_CACHE` enables a **shared Redis-based cache** across all shards, providing:
 *
 * ✅ A **centralized, consistent** cache  
 * ✅ Elimination of duplicated memory caches per shard  
 * ✅ Major boost in performance and real-time access  
 * ✅ Reduced load on PostgreSQL (fewer direct queries)  
 * ✅ Instant data sharing between shards
 *
 * ---
 *
 * 🔧 Behavior:
 *
 * If `process.env.SHOULD_USE_REDIS_MULTI_SHARD_CACHE` is **defined and truthy**:
 *
 * 1. Redis is used as a shared, in-memory cache across all shards.
 * 2. `.get()` operations look first in Redis (`key = ${table}:${id}`).
 * 3. `.set()` operations write to both Redis and PostgreSQL.
 * 4. If data is missing in Redis, it's fetched from PostgreSQL and cached.
 * 5. (Optional) TTL can be applied for cache expiration and cleanup.
 *
 * ---
 *
 * 🔒 Redis Requirements:
 *
 * Redis must be running on the system — either locally (e.g. via `sudo apt install redis-server`)
 * or in a secure container. The default port is `6379`.
 * No password is required by default unless configured in `/etc/redis/redis.conf`.
 *
 * ---
 *
 * 📝 Example usage:
 *
 * ```bash
 * SHOULD_USE_REDIS_MULTI_SHARD_CACHE=true node index.js
 * ```
 *
 * ---
 *
 * ⚠️ If this variable is not defined, the bot falls back to using per-shard memory caches,
 * with periodic sync to PostgreSQL — which is less consistent but simpler for single-process setups.
 *
 * @see https://redis.io
 * @see https://gitlab.com/ihrz/ihrz
 */
let dbInstance: PallasDB | null = null;

if (process.env.SHOULD_USE_REDIS_MULTI_SHARD_CACHE !== null && envBool(process.env.SHOULD_USE_REDIS_MULTI_SHARD_CACHE)) {
	dbInstance = await new Promise<PallasDB>(async (resolve, reject) => {
		logger.log(`${config.console.emojis.HOST} >> Initializing cached Postgres database setup for multi-shard !`.green);

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

		const memoryDB = new PallasDB({
			dialect: "redis",
			redis: { host: 'localhost', port: 6379 },
			tables
		});

		for (const table of tables) {
			const memoryTable = memoryDB.table(table);
			await memoryTable.deleteAll()
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

		setInterval(syncToPostgres, 60_000 * 5);
		resolve(memoryDB);
	});
}

logger.legacy("[*] iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz).".gray);
logger.legacy("[*] Warning: iHorizon Discord bot is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International".gray);
logger.legacy("[*] Please respect the terms of this license. Learn more at: https://creativecommons.org/licenses/by-nc-sa/4.0".gray);

const manager = new ShardingManager('./src/core/bot.ts', { totalShards: "auto", token: _token || process.env.BOT_TOKEN || config.discord.token });
manager.on("shardCreate", (shard) => logger.log(`${config.console.emojis.HOST} >> The Shard number ${shard.id} is now launched :) !`.green));
manager.spawn();