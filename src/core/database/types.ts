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
import { HorizonDB } from "./driver/horizondb.ts";
import { Json } from "./driver/json.ts";
import { Memory } from "./driver/memory.ts";
import { Postgres } from "./driver/postgres.ts";
import { Sqlite } from "./driver/sqlite.ts";

export enum ErrorKind {
	MissingValue = "MISSING_VALUE",
	ParseException = "PARSE_EXCEPTION",
	InvalidType = "INVALID_TYPE"
}

export type DataLike<T = any> = { id: string; value: T };
export type Table = Map<string, any>;

export type DB =
	| Sqlite<any>
	| Json<any>
	| Memory<any>
	| Postgres<any>
	| HorizonDB<any>;

export type MultiDB = { og?: Postgres; x: DB; y?: Postgres };

export type PostgresOptions = {
	table?: string;
	connectionString?: string;
	sql?: SQL;
};
