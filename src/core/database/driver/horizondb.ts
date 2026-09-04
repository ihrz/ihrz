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

import { HorizonDB as HorizonDBClient, type Json } from "ihrzdb";
import { ErrorKind } from "../types.ts";

export interface HorizonDBDriverOptions {
	table?: string;
	url?: string;
	login?: string;
	password?: string;
	requestTimeoutMs?: number;
}

/**
 * HorizonDB driver — iHorizon's private key-value database technology.
 *
 * Wraps the `ihrzdb` WebSocket SDK while exposing the exact same interface as
 * the other database drivers (`json`, `memory`, `postgresql`, `sqlite`).
 *
 * Table views returned by `table()` share the underlying WebSocket connection
 * (the server resolves dot-nested keys, so no client-side merge is needed).
 */
export class HorizonDB<D = any> {
	private readonly sdk: HorizonDBClient;
	private readonly tableName: string;

	constructor(
		options: HorizonDBDriverOptions & { sdk?: HorizonDBClient } = {}
	) {
		if (options.sdk) {
			this.sdk = options.sdk;
		} else {
			this.sdk = new HorizonDBClient({
				url: options.url ?? "ws://127.0.0.1:8080",
				username: options.login,
				password: options.password,
				requestTimeoutMs: options.requestTimeoutMs
			});
		}
		this.tableName = options.table ?? "json";
	}

	private createError(message: string, kind: ErrorKind): Error {
		const error = new Error(message);
		error.name = kind;
		Object.defineProperty(error, "kind", {
			value: kind,
			writable: false
		});
		return error;
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

	/**
	 * Waits for the initial handshake (connection + login). If it failed (e.g.
	 * the server was down at startup), the SDK keeps reconnecting in the
	 * background and every operation waits for the reconnect in `send()` — so
	 * an initial failure is not fatal.
	 */
	private async ensureReady(): Promise<void> {
		try {
			await this.sdk.ready();
		} catch {
			// The SDK's auto-reconnect takes over from here.
		}
	}

	async all<T = D>(): Promise<{ id: string; value: T }[]> {
		await this.ensureReady();
		return (await this.sdk.all()) as unknown as { id: string; value: T }[];
	}

	async get<T = D>(key: string): Promise<T | null> {
		await this.ensureReady();
		if (typeof key != "string") {
			throw this.createError(
				`First argument (key) needs to be a string received "${typeof key}"`,
				ErrorKind.InvalidType
			);
		}

		const value = await this.sdk.get<T>(key);
		return value === undefined ? null : value;
	}

	async set<T = D>(key: string, value: T): Promise<T> {
		await this.ensureReady();
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

		await this.sdk.set(key, value as Json);
		return value;
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
		await this.ensureReady();
		return this.sdk.has(key);
	}

	async delete(key: string): Promise<number> {
		await this.ensureReady();
		if (typeof key != "string") {
			throw this.createError(
				`First argument (key) needs to be a string received "${typeof key}"`,
				ErrorKind.InvalidType
			);
		}

		const existed = (await this.sdk.has(key)) ? 1 : 0;
		await this.sdk.delete(key);
		return existed;
	}

	async deleteAll(): Promise<number> {
		await this.ensureReady();
		await this.sdk.deleteAll();
		// The protocol doesn't report how many rows were deleted.
		return 0;
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

		await this.ensureReady();

		let amount: number = value;
		if (typeof amount != "number") {
			try {
				amount = parseFloat(amount as string);
			} catch (_) {
				throw this.createError(
					`Value to add/subtract with key: (${key}) is not a number and couldn't be parsed to a number`,
					ErrorKind.InvalidType
				);
			}
		}

		if (Number.isNaN(amount)) {
			throw this.createError(
				`Value to add/subtract with key: (${key}) is not a number and couldn't be parsed to a number`,
				ErrorKind.InvalidType
			);
		}

		try {
			if (sub) await this.sdk.sub(key, amount);
			else await this.sdk.add(key, amount);
		} catch (error) {
			if (error instanceof Error && /non-numeric/i.test(error.message)) {
				throw this.createError(
					`Current value with key: (${key}) is not a number and couldn't be parsed to a number`,
					ErrorKind.InvalidType
				);
			}
			throw error;
		}

		return (await this.get<number>(key)) ?? 0;
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

		await this.ensureReady();

		try {
			for (const element of values) {
				await this.sdk.push(key, element as Json);
			}
		} catch (error) {
			if (error instanceof Error && /not an array/i.test(error.message)) {
				throw this.createError(
					`Current value with key: (${key}) is not an array`,
					ErrorKind.InvalidType
				);
			}
			throw error;
		}

		return (await this.get<T[]>(key)) ?? [];
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

		await this.ensureReady();

		if (typeof value === "function" || once) {
			// Predicate / "once" semantics are not expressible server-side:
			// fall back to the same read-modify-write logic as the local drivers.
			const currentArr = await this.getArray<T>(key);
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

		try {
			const elements = Array.isArray(value) ? value : [value];
			for (const element of elements) {
				await this.sdk.pull(key, element as Json);
			}
		} catch (error) {
			if (error instanceof Error && /not an array/i.test(error.message)) {
				throw this.createError(
					`Current value with key: (${key}) is not an array`,
					ErrorKind.InvalidType
				);
			}
			throw error;
		}

		return (await this.get<T[]>(key)) ?? [];
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

		const rows = await this.all<T>();
		return rows.filter((row) => row.id.startsWith(query));
	}

	async table<T = D>(table: string): Promise<HorizonDB<T>> {
		await this.ensureReady();
		if (typeof table != "string") {
			throw this.createError(
				`First argument (table) needs to be a string received "${typeof table}"`,
				ErrorKind.InvalidType
			);
		}

		// The SDK view shares the same WebSocket connection.
		return new HorizonDB<T>({ sdk: this.sdk.table(table) });
	}

	public async export(): Promise<{ id: string; value: any }[]> {
		return this.all();
	}

	public close(): void {
		this.sdk.close();
	}
}
