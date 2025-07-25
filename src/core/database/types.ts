import { SQL } from "bun";
import { Json } from "./driver/json.ts";
import { Memory } from "./driver/memory.ts";
import { Postgres } from "./driver/postgres.ts";
import { Sqlite } from "./driver/sqlite.ts";

export enum ErrorKind {
	MissingValue = "MISSING_VALUE",
	ParseException = "PARSE_EXCEPTION",
	InvalidType = "INVALID_TYPE",
}

export type DataLike<T = any> = { id: string; value: T };
export type Table = Map<string, any>;

export type DB = Sqlite<any> | Json<any> | Memory<any> | Postgres<any>;

export type PostgresOptions = {
	table?: string;
	connectionString?: string;
	sql?: SQL;
};