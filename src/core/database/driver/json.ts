import { get_property, set_property, unset_property } from "../lodash.ts";
import { DataLike, ErrorKind, Table } from "../types.ts";
import { existsSync, readFileSync } from "fs";

export class Json<D = any> {
	private tableName: string;
	private path: string;
	private store = new Map<string, Table>();
	private mirrors: Json[] = [];

	constructor(options: {
		table?: string;
		filePath?: string;
	} = {}) {
		options.table ??= "json";
		options.filePath ??= "db.json";
		this.tableName = options.table;
		this.path = options.filePath;

		this.loadContentSync();
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

	public loadContentSync(): void {
		if (existsSync(this.path)) {
			const contents = readFileSync(this.path, { encoding: "utf-8" });

			try {
				const data = JSON.parse(contents);
				for (const table in data) {
					const store = this.getOrCreateTable(table);
					data[table].forEach((d: DataLike) =>
						store.set(d.id, d.value)
					);
				}
			} catch {
				throw new Error("Database malformed");
			}
		} else {
			Bun.write(this.path, "{}");
		}
	}

	public async loadContent(): Promise<void> {
		if (existsSync(this.path)) {
			const contents = Bun.file(this.path).toString()

			try {
				const data = JSON.parse(contents);
				for (const table in data) {
					const store = this.getOrCreateTable(table);
					data[table].forEach((d: DataLike) =>
						store.set(d.id, d.value)
					);
				}
			} catch {
				throw new Error("Database malformed");
			}
		} else {
			Bun.write(this.path, "{}");
		}
	}

	public async export(): Promise<Record<string, DataLike[]>> {
		const val: Record<string, DataLike[]> = {};

		for (const tableName of this.store.keys()) {
			val[tableName] = await this.getAllRows(tableName);
		}

		return val;
	}

	private async snapshot(): Promise<void> {
		const data = await this.export();
		Bun.write(this.path, JSON.stringify(data));
	}

	private getOrCreateTable(name: string): Table {
		const table = this.store.get(name);
		if (table) return table;

		const newTable = new Map();
		this.store.set(name, newTable);
		return newTable;
	}


	private async prepare(table: string): Promise<void> {
		this.getOrCreateTable(table);


		for (const mirror of this.mirrors) {
			await mirror.prepare(table);
		}
	}

	private async getAllRows(
		table: string
	): Promise<{ id: string; value: any }[]> {
		const store = this.getOrCreateTable(table);
		return [...store.entries()].map(([k, v]) => ({ id: k, value: v }));
	}

	private async getRowByKey<T>(
		table: string,
		key: string
	): Promise<[T | null, boolean]> {
		const store = this.getOrCreateTable(table);
		const val = store.get(key) as T;
		return [val == null ? null : val, val == null ? false : true];
	}

	private async getStartsWith(
		table: string,
		query: string
	): Promise<{ id: string; value: any }[]> {
		const store = this.getOrCreateTable(table);
		return [...store.entries()]
			.filter(([k]) => k.startsWith(query))
			.map(([k, v]) => ({ id: k, value: v }));
	}

	private async setRowByKey<T>(
		table: string,
		key: string,
		value: any,
		update: boolean
	): Promise<T> {
		const store = this.getOrCreateTable(table);
		store.set(key, value);
		await this.snapshot();


		for (const mirror of this.mirrors) {
			await mirror.setRowByKey(table, key, value, update);
		}
		return value as T;
	}

	private async deleteAllRows(table: string): Promise<number> {
		const store = this.getOrCreateTable(table);
		const size = store.size;
		store.clear();
		await this.snapshot();


		for (const mirror of this.mirrors) {
			await mirror.deleteAllRows(table);
		}

		return size;
	}

	private async deleteRowByKey(table: string, key: string): Promise<number> {
		const store = this.getOrCreateTable(table);
		const deleted = store.delete(key) ? 1 : 0;
		await this.snapshot();


		for (const mirror of this.mirrors) {
			await mirror.deleteRowByKey(table, key);
		}

		return deleted;
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

	async table<T = D>(table: string): Promise<Json<T>> {
		if (typeof table != "string") {
			throw this.createError(
				`First argument (table) needs to be a string received "${typeof table}"`,
				ErrorKind.InvalidType
			);
		}

		const newDB = new Json({
			table: table,
			filePath: this.path
		});

		newDB.store = this.store;
		await newDB.prepare(table);

		return newDB;
	}
}