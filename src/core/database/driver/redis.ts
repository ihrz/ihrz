import { RedisClient } from "bun";
import { get_property, set_property, unset_property } from "../lodash.ts";
import { DataLike, ErrorKind } from "../types.ts";

export class Redis<D = any> {
	private tableName: string;
	private client: RedisClient;
	private mirrors: Redis[] = [];

	constructor(options: {
		table?: string;
		redisUrl?: string;
		connectionOptions?: any;
	} = {}) {
		options.table ??= "memory";
		this.tableName = options.table.toLowerCase();

		// Initialize Redis client with custom URL or default environment settings
		if (options.redisUrl) {
			this.client = new RedisClient(options.redisUrl, options.connectionOptions);
		} else {
			this.client = new RedisClient(options.connectionOptions);
		}
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

	private getTableKey(key: string): string {
		return `${this.tableName}:${key}`;
	}

	private getTablePattern(): string {
		return `${this.tableName}:*`;
	}

	public async export(): Promise<Record<string, DataLike[]>> {
		const val: Record<string, DataLike[]> = {};

		// Get all tables by scanning for different table prefixes
		// This is a simplified approach - in production you might want to maintain a separate index
		const keys = await this.client.send("KEYS", ["*"]);
		const tables = new Set<string>();

		for (const key of keys) {
			const parts = key.split(":");
			if (parts.length >= 2) {
				tables.add(parts[0]);
			}
		}

		for (const tableName of tables) {
			val[tableName] = await this.getAllRows(tableName);
		}

		return val;
	}

	private async prepare(table: string): Promise<void> {
		// Redis doesn't require table preparation like SQL databases
		// We just ensure the connection is ready
		if (!this.client.connected) {
			await this.client.connect();
		}

		for (const mirror of this.mirrors) {
			await mirror.prepare(table);
		}
	}

	private async getAllRows(
		table: string
	): Promise<{ id: string; value: any }[]> {
		const pattern = `${table}:*`;
		const keys = await this.client.send("KEYS", [pattern]);
		const results: { id: string; value: any }[] = [];

		if (keys.length === 0) return results;

		// Use mget for better performance when getting multiple values
		const values = await this.client.send("MGET", keys);

		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			const value = values[i];
			const id = key.substring(table.length + 1); // Remove table prefix

			if (value !== null) {
				try {
					results.push({ id, value: JSON.parse(value) });
				} catch {
					// If parsing fails, store as string
					results.push({ id, value });
				}
			}
		}

		return results;
	}

	private async getRowByKey<T>(
		table: string,
		key: string
	): Promise<[T | null, boolean]> {
		const redisKey = `${table}:${key}`;
		const value = await this.client.get(redisKey);

		if (value === null) {
			return [null, false];
		}

		try {
			const parsed = JSON.parse(value);
			return [parsed as T, true];
		} catch {
			// If parsing fails, return as string
			return [value as T, true];
		}
	}

	private async getStartsWith(
		table: string,
		query: string
	): Promise<{ id: string; value: any }[]> {
		const pattern = `${table}:${query}*`;
		const keys = await this.client.send("KEYS", [pattern]);
		const results: { id: string; value: any }[] = [];

		if (keys.length === 0) return results;

		const values = await this.client.send("MGET", keys);

		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			const value = values[i];
			const id = key.substring(table.length + 1);

			if (value !== null) {
				try {
					results.push({ id, value: JSON.parse(value) });
				} catch {
					results.push({ id, value });
				}
			}
		}

		return results;
	}

	private async setRowByKey<T>(
		table: string,
		key: string,
		value: any,
		update: boolean
	): Promise<T> {
		const redisKey = `${table}:${key}`;
		const serialized = JSON.stringify(value);

		await this.client.set(redisKey, serialized);

		// Mirror to other Redis instances
		for (const mirror of this.mirrors) {
			await mirror.setRowByKey(table, key, value, update);
		}

		return value as T;
	}

	private async deleteAllRows(table: string): Promise<number> {
		const pattern = `${table}:*`;
		const keys = await this.client.send("KEYS", [pattern]);

		if (keys.length === 0) return 0;

		await this.client.send("DEL", keys);

		// Mirror to other Redis instances
		for (const mirror of this.mirrors) {
			await mirror.deleteAllRows(table);
		}

		return keys.length;
	}

	private async deleteRowByKey(table: string, key: string): Promise<number> {
		const redisKey = `${table}:${key}`;
		const deleted = await this.client.del(redisKey);

		// Mirror to other Redis instances
		for (const mirror of this.mirrors) {
			await mirror.deleteRowByKey(table, key);
		}

		return deleted ? 1 : 0;
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

	// Close the Redis connection
	public close(): void {
		this.client.close();
	}

	// Check if connected to Redis
	public get connected(): boolean {
		return this.client.connected;
	}

	// Connect to Redis manually
	public async connect(): Promise<void> {
		await this.client.connect();
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
			if (result instanceof Object == false) {
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

		for (const [k, v] of Object.entries(object)) {
			data[k] = v;
		}

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
			return this.set(keySplit[0], obj);
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
		value: T | T[] | ((data: T, index: string) => boolean),
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

	async table<T = D>(table: string): Promise<Redis<T>> {
		table = table.toLowerCase()
		if (typeof table != "string") {
			throw this.createError(
				`First argument (table) needs to be a string received "${typeof table}"`,
				ErrorKind.InvalidType
			);
		}

		const newDB = new Redis<T>({
			table: table,
		});

		// Share the same Redis client instance for better connection management
		newDB.client = this.client;
		await newDB.prepare(table);
		return newDB;
	}
}