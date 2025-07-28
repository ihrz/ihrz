import { SQL } from "bun";
import { Json } from "./driver/json.ts";
import { Memory } from "./driver/memory.ts";
import { Postgres } from "./driver/postgres.ts";
import { Sqlite } from "./driver/sqlite.ts";
import { Horizon } from "./driver/horizon.ts";

export enum ErrorKind {
	MissingValue = "MISSING_VALUE",
	ParseException = "PARSE_EXCEPTION",
	InvalidType = "INVALID_TYPE",
}

export type DataLike<T = any> = { id: string; value: T };
export type Table = Map<string, any>;

export type DB = Sqlite<any> | Json<any> | Memory<any> | Postgres<any> | Horizon;

export type PostgresOptions = {
	table?: string;
	connectionString?: string;
	sql?: SQL;
};

export interface HorizonDatabaseClientOptions {
	login: string;
	password: string;
	tables?: string[];
	enableVerboses?: boolean;
}

export interface PacketMessage {
	id: string;
	type: 'request' | 'response' | 'error';
	operation?: string;
	table?: string;
	key?: string;
	value?: any;
	amount?: number;
	element?: any;
	time?: number;
	defaultValue?: any;
	data?: any;
	error?: string;
	// Simple auth fields
	login?: string;
	password?: string;
	sessionId?: string;
}