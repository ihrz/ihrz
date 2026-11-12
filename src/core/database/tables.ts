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

import type { Client } from "discord.js";
import type { UnifiedDatabase } from "./types.js";

const TABLE_NAMES = {
	tempTable: "temp",
	blacklistTable: "blacklist",
	ownerTable: "owner",
	profilTable: "user_profil",
	authRestoreTable: "authrestore",
	prevnamesTable: "prevnames",
	apiTable: "api",
	scheduleTable: "schedule",
	metasTable: "metas",
	giveawaysTable: "giveaways",
	backupsTable: "backups",
	backupSchedulesTable: "backup_schedules",
	musicLibraryTable: "music_library"
} as const;

type TableKey = keyof typeof TABLE_NAMES;

const opened = new Map<TableKey, UnifiedDatabase>();

function lazyTable(key: TableKey): UnifiedDatabase {
	const resolve = (): UnifiedDatabase => {
		const table = opened.get(key);
		if (!table) {
			throw new Error(
				`Database table "${TABLE_NAMES[key]}" used before the client is ready`
			);
		}
		return table;
	};

	return new Proxy({} as object, {
		get(_target, property) {
			const table = resolve();
			const value = Reflect.get(table, property, table);
			return typeof value === "function" ? value.bind(table) : value;
		},
		set(_target, property, value) {
			const table = resolve();
			return Reflect.set(table, property, value, table);
		},
		has(_target, property) {
			return Reflect.has(resolve(), property);
		}
	}) as UnifiedDatabase;
}

export const tempTable = lazyTable("tempTable");
export const blacklistTable = lazyTable("blacklistTable");
export const ownerTable = lazyTable("ownerTable");
export const profilTable = lazyTable("profilTable");
export const authRestoreTable = lazyTable("authRestoreTable");
export const prevnamesTable = lazyTable("prevnamesTable");
export const apiTable = lazyTable("apiTable");
export const scheduleTable = lazyTable("scheduleTable");
export const metasTable = lazyTable("metasTable");
export const giveawaysTable = lazyTable("giveawaysTable");
export const backupsTable = lazyTable("backupsTable");
export const backupSchedulesTable = lazyTable("backupSchedulesTable");
export const musicLibraryTable = lazyTable("musicLibraryTable");

/**
 * Opens the given tables, in the given order, and makes them usable through
 * the exports above.
 */
export async function initTables(
	client: Pick<Client, "db">,
	keys: readonly TableKey[] = Object.keys(TABLE_NAMES) as TableKey[]
): Promise<void> {
	for (const key of keys) {
		opened.set(key, await client.db.table(TABLE_NAMES[key]));
	}
}

/** Forgets every opened table (tests only). */
export function resetTables(): void {
	opened.clear();
}
