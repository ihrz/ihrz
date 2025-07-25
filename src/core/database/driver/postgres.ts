
import { get_property, set_property, unset_property } from "../lodash.ts";
import { ErrorKind, PostgresOptions } from "../types.ts";
import { SQL } from "bun";

export class Postgres<D = any> {
	private tableName: string;
	private connectionString: string | undefined;
	private sql: SQL;
	private mirrors: Postgres[] = [];
	private ownsConnection: boolean;

	constructor(options: PostgresOptions) {
		if (options.sql) {
			this.sql = options.sql;
			this.ownsConnection = false;
		} else if (options.connectionString) {
			this.connectionString = options.connectionString;
			this.sql = new SQL(this.connectionString);
			this.ownsConnection = true;
		} else {

			throw new Error("Either 'connectionString' or 'sql' must be provided to Postgres constructor.");
		}
		this.tableName = options.table ? options.table.toLowerCase() : "json";
	}

	private createError(message: string, kind: ErrorKind): Error {
		const error = new Error(message);
		error.name = kind;
		Object.defineProperty(error, 'kind', {
			value: kind,
			writable: false
		});
		return error;
	}


	public async export(): Promise<{ id: string; value: any }[]> {
		await this.ensureTableExists(this.tableName);
		try {
			const rows = await this.sql`
                SELECT "id", "value" FROM ${this.sql.unsafe(this.tableName)}
            `;
			return rows.map((row: any) => ({
				id: row.id,
				value: typeof row.value === 'string' ? JSON.parse(row.value) : row.value
			}));
		} catch (err) {
			console.error("Error exporting ", err);
			throw new Error("Failed to export data");
		}
	}


	private async ensureTableExists(tableName: string): Promise<void> {
		try {
			await this.sql`
                CREATE TABLE IF NOT EXISTS ${this.sql.unsafe(tableName.toLowerCase())} (
                    "id" VARCHAR(255) PRIMARY KEY,
                    "value" TEXT NOT NULL
                )
            `;
		} catch (err) {
			console.error(`Error ensuring table ${tableName.toLowerCase()} exists:`, err);
			throw new Error(`Failed to ensure table ${tableName.toLowerCase()} exists`);
		}
	}


	private async getAllRows(
		table: string
	): Promise<{ id: string; value: any }[]> {
		await this.ensureTableExists(table.toLowerCase());
		try {
			const rows = await this.sql`
                SELECT "id", "value" FROM ${this.sql.unsafe(table.toLowerCase())}
            `;
			return rows.map((row: any) => ({
				id: row.id,
				value: typeof row.value === 'string' ? JSON.parse(row.value) : row.value
			}));
		} catch (err) {
			console.error(`Error getting all rows from ${table.toLowerCase()}:`, err);
			throw new Error(`Failed to get rows from ${table.toLowerCase()}`);
		}
	}

	private async getRowByKey<T>(
		table: string,
		key: string
	): Promise<[T | null, boolean]> {
		await this.ensureTableExists(table);
		try {

			const rows = await this.sql`
                SELECT "value" FROM ${this.sql.unsafe(table.toLowerCase())} WHERE "id" = ${key}
            `;
			if (rows.length === 0) {
				return [null, false];
			}
			const val = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
			return [val as T, true];
		} catch (err) {
			console.error(`Error getting row by key ${key} from ${table.toLowerCase()}:`, err);
			return [null, false];
		}
	}


	private async getStartsWith(
		table: string,
		query: string
	): Promise<{ id: string; value: any }[]> {
		await this.ensureTableExists(table);
		try {
			const rows = await this.sql`
                SELECT "id", "value" FROM ${this.sql.unsafe(table.toLowerCase())} WHERE "id" LIKE ${query + '%'}
            `;
			return rows.map((row: any) => ({
				id: row.id,
				value: typeof row.value === 'string' ? JSON.parse(row.value) : row.value
			}));
		} catch (err) {
			console.error(`Error getting rows starting with ${query} from ${table.toLowerCase()}:`, err);
			return [];
		}
	}


	private async setRowByKey<T>(
		table: string,
		key: string,
		value: any,
		_update: boolean
	): Promise<T> {
		await this.ensureTableExists(table.toLowerCase());
		try {
			const valueString = JSON.stringify(value);
			await this.sql`
                INSERT INTO ${this.sql.unsafe(table.toLowerCase())} ("id", "value")
                VALUES (${key}, ${valueString})
                ON CONFLICT ("id")
                DO UPDATE SET "value" = EXCLUDED."value"
            `;
			for (const mirror of this.mirrors) {
				await mirror.setRowByKey(table, key, value, _update);
			}
			return value as T;
		} catch (err) {
			console.error(`Error setting row by key ${key} in ${table.toLowerCase()}:`, err);
			throw new Error(`Failed to set value for key ${key}`);
		}
	}


	private async deleteAllRows(table: string): Promise<number> {
		await this.ensureTableExists(table.toLowerCase());
		try {

			const result = await this.sql`
                DELETE FROM ${this.sql.unsafe(table.toLowerCase())}
            `;

			const deletedCount = result.count ?? result.affectedRows ?? 0;
			for (const mirror of this.mirrors) {
				await mirror.deleteAllRows(table.toLowerCase());
			}
			return deletedCount;
		} catch (err) {
			console.error(`Error deleting all rows from ${table.toLowerCase()}:`, err);
			throw new Error(`Failed to delete all rows from ${table.toLowerCase()}`);
		}
	}


	private async deleteRowByKey(table: string, key: string): Promise<number> {
		await this.ensureTableExists(table.toLowerCase());
		try {
			const result = await this.sql`
                DELETE FROM ${this.sql.unsafe(table.toLowerCase())} WHERE "id" = ${key}
            `;

			const deletedCount = result.count ?? result.affectedRows ?? 0;
			for (const mirror of this.mirrors) {
				await mirror.deleteRowByKey(table.toLowerCase(), key);
			}
			return deletedCount;
		} catch (err) {
			console.error(`Error deleting row by key ${key} from ${table.toLowerCase()}:`, err);
			throw new Error(`Failed to delete row with key ${key}`);
		}
	}


	private async addSubtract(
		key: string,
		value: number,
		sub = false
	): Promise<number> {
		if (typeof key != "string") {
			throw this.createError(
				`First argument (key) needs to be a string received "${typeof key}"`,
				ErrorKind.InvalidType
			);
		}
		if (value == null) {
			throw this.createError(
				"Missing second argument (value)",
				ErrorKind.MissingValue
			);
		}
		let currentNumber = await this.get<number>(key);
		if (currentNumber == null) currentNumber = 0;
		if (typeof currentNumber != "number") {
			try {
				currentNumber = parseFloat(currentNumber as string);
			} catch (_) {
				throw this.createError(
					`Current value with key: (${key}) is not a number and couldn't be parsed to a number`,
					ErrorKind.InvalidType
				);
			}
		}
		if (typeof value != "number") {
			try {
				value = parseFloat(value as string);
			} catch (_) {
				throw this.createError(
					`Value to add/subtract with key: (${key}) is not a number and couldn't be parsed to a number`,
					ErrorKind.InvalidType
				);
			}
		}
		sub ? (currentNumber -= value) : (currentNumber += value);
		await this.set<number>(key, currentNumber);
		return currentNumber;
	}


	private async getArray<T = D>(key: string): Promise<T[]> {
		const currentArr = (await this.get<T[]>(key)) ?? [];
		if (!Array.isArray(currentArr)) {
			throw this.createError(
				`Current value with key: (${key}) is not an array`,
				ErrorKind.InvalidType
			);
		}
		return currentArr;
	}



	async all<T = D>(): Promise<{ id: string; value: T }[]> {
		return this.getAllRows(this.tableName);
	}

	async get<T = D>(key: string): Promise<T | null> {
		if (typeof key != "string") {
			throw this.createError(
				`First argument (key) needs to be a string received "${typeof key}"`,
				ErrorKind.InvalidType
			);
		}
		if (key.includes(".")) {
			const keySplit = key.split(".");
			const [result] = await this.getRowByKey<T>(
				this.tableName,
				keySplit[0]
			);
			return get_property(result, keySplit.slice(1).join("."));
		}
		const [result] = await this.getRowByKey<T>(this.tableName, key);
		return result;
	}

	async set<T = D>(key: string, value: T): Promise<T> {
		if (typeof key != "string") {
			throw this.createError(
				`First argument (key) needs to be a string received "${typeof key}"`,
				ErrorKind.InvalidType
			);
		}
		if (value == null) {
			throw this.createError(
				"Missing second argument (value)",
				ErrorKind.MissingValue
			);
		}
		if (key.includes(".")) {
			const keySplit = key.split(".");
			const [result, exist] = await this.getRowByKey(
				this.tableName,
				keySplit[0]
			);
			let obj: object;
			if (result instanceof Object == false || result == null) {
				obj = {};
			} else {
				obj = result as object;
			}
			const valueSet = set_property(
				obj ?? {},
				keySplit.slice(1).join("."),
				value
			);
			return this.setRowByKey(
				this.tableName,
				keySplit[0],
				valueSet,
				exist
			);
		}
		const exist = (await this.getRowByKey(this.tableName, key))[1];
		return this.setRowByKey(this.tableName, key, value, exist);
	}

	async update<T = D>(key: string, object: object): Promise<T> {
		if (typeof key != "string") {
			throw this.createError(
				`First argument (key) needs to be a string received "${typeof key}"`,
				ErrorKind.InvalidType
			);
		}
		if (typeof object != "object" || object == null) {
			throw this.createError(
				`Second argument (object) needs to be an object received "${typeof object}"`,
				ErrorKind.InvalidType
			);
		}
		const data = (await this.get<any>(key)) ?? {};
		if (typeof data != "object" || Array.isArray(data)) {
			throw this.createError(
				`The current data is not an object, update only works on objects`,
				ErrorKind.InvalidType
			);
		}

		Object.assign(data, object);
		return await this.set(key, data);
	}

	async has(key: string): Promise<boolean> {
		return (await this.get(key)) != null;
	}

	async delete(key: string): Promise<number> {
		if (typeof key != "string") {
			throw this.createError(
				`First argument (key) needs to be a string received "${typeof key}"`,
				ErrorKind.InvalidType
			);
		}
		if (key.includes(".")) {
			const keySplit = key.split(".");
			const obj = (await this.get<any>(keySplit[0])) ?? {};
			unset_property(obj, keySplit.slice(1).join("."));

			return this.set(keySplit[0], obj) as unknown as number;
		}
		return this.deleteRowByKey(this.tableName, key);
	}

	async deleteAll(): Promise<number> {
		return this.deleteAllRows(this.tableName);
	}

	async add(key: string, value: number): Promise<number> {
		return this.addSubtract(key, value);
	}

	async sub(key: string, value: number): Promise<number> {
		return this.addSubtract(key, value, true);
	}

	async push<T = D>(key: string, ...values: T[]): Promise<T[]> {
		if (typeof key != "string") {
			throw this.createError(
				`First argument (key) needs to be a string received "${typeof key}"`,
				ErrorKind.InvalidType
			);
		}
		if (values.length === 0) {
			throw this.createError(
				"Missing second argument (value)",
				ErrorKind.MissingValue
			);
		}
		const currentArr = await this.getArray<T>(key);
		currentArr.push(...values);
		return this.set(key, currentArr);
	}

	async unshift<T = D>(key: string, value: T | T[]): Promise<T[]> {
		if (typeof key != "string") {
			throw this.createError(
				`First argument (key) needs to be a string received "${typeof key}"`,
				ErrorKind.InvalidType
			);
		}
		if (value == null) {
			throw this.createError(
				"Missing second argument (value)",
				ErrorKind.InvalidType
			);
		}
		let currentArr = await this.getArray<T>(key);
		if (Array.isArray(value)) currentArr = value.concat(currentArr);
		else currentArr.unshift(value);
		return await this.set(key, currentArr);
	}

	async pop<T = D>(key: string): Promise<T | undefined> {
		if (typeof key != "string") {
			throw this.createError(
				`First argument (key) needs to be a string received "${typeof key}"`,
				ErrorKind.InvalidType
			);
		}
		const currentArr = await this.getArray<T>(key);
		const value = currentArr.pop();
		await this.set(key, currentArr);
		return value;
	}

	async shift<T = D>(key: string): Promise<T | undefined> {
		if (typeof key != "string") {
			throw this.createError(
				`First argument (key) needs to be a string received "${typeof key}"`,
				ErrorKind.InvalidType
			);
		}
		const currentArr = await this.getArray<T>(key);
		const value = currentArr.shift();
		await this.set(key, currentArr);
		return value;
	}

	async pull<T = D>(
		key: string,
		value: T | T[] | ((arg0: T, index: string) => boolean),
		once = false
	): Promise<T[]> {
		if (typeof key != "string") {
			throw this.createError(
				`First argument (key) needs to be a string received "${typeof key}"`,
				ErrorKind.InvalidType
			);
		}
		if (value == null) {
			throw this.createError(
				"Missing second argument (value)",
				ErrorKind.MissingValue
			);
		}
		const currentArr = await this.getArray<T>(key);
		if (!Array.isArray(value) && typeof value != "function")
			value = [value];
		const data = [];
		for (const i in currentArr) {
			if (
				Array.isArray(value)
					? value.includes(currentArr[i])
					: (value as any)(currentArr[i], i)
			)
				continue;
			data.push(currentArr[i]);
			if (once) break;
		}
		return await this.set(key, data);
	}

	async startsWith<T = D>(
		query: string
	): Promise<{ id: string; value: T }[]> {
		if (typeof query != "string") {
			throw this.createError(
				`First argument (query) needs to be a string received "${typeof query}"`,
				ErrorKind.InvalidType
			);
		}
		const results = await this.getStartsWith(this.tableName, query);
		return results;
	}


	async table<T = D>(tableName: string): Promise<Postgres<T>> {
		if (typeof tableName != "string") {
			throw this.createError(
				`First argument (table) needs to be a string received "${typeof tableName}"`,
				ErrorKind.InvalidType
			);
		}

		const newDB = new Postgres<T>({
			table: tableName.toLowerCase(),
			sql: this.sql
		});

		await newDB.ensureTableExists(tableName.toLowerCase());
		return newDB;
	}

	public async close(): Promise<void> {
		try {
			if (this.ownsConnection && this.sql && typeof (this.sql as any).end === 'function') {
				await (this.sql as any).end();
			}
		} catch (err) {
			console.error("Error closing Postgres connection:", err);
		}
	}
}
