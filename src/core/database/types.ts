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

import { SQL } from "bun";
import { Json } from "./driver/json.ts";
import { Memory } from "./driver/memory.ts";
import { Postgres } from "./driver/postgres.ts";
import { Sqlite } from "./driver/sqlite.ts";
import { HorizonDB } from "./driver/horizondb.ts";

export enum ErrorKind {
	MissingValue = "MISSING_VALUE",
	ParseException = "PARSE_EXCEPTION",
	InvalidType = "INVALID_TYPE"
}

// What a key holds when the caller does not say (`db.get(key)`): stored
// values are untyped JSON and the bot's hundreds of call sites read them
// without a type argument. `get<T>()` is the typed way in.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StoredValue = any;

export type DataLike<T = StoredValue> = { id: string; value: T };
export type Table = Map<string, unknown>;

export type UnifiedDatabase =
	| Sqlite<StoredValue>
	| Json<StoredValue>
	| Memory<StoredValue>
	| Postgres<StoredValue>
	| HorizonDB<StoredValue>;

export type PostgresOptions = {
	table?: string;
	connectionString?: string;
	sql?: SQL;
};
