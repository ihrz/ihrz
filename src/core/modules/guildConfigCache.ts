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

/*
 * Short-lived in-process cache for guild settings read on hot paths (every
 * message or event): language, prefix, module configs.
 *
 * Every write made through `client.db` (set, update, delete, push, pull, add,
 * sub) invalidates the overlapping cached keys before and after it runs, so
 * in-process changes are seen immediately. The TTL only bounds the staleness
 * of writes made elsewhere (dashboard / API, other processes).
 *
 * Values are cloned on read: callers may mutate what they get without
 * corrupting the cache.
 */

import { UnifiedDatabase } from "../database/types.js";

const DEFAULT_TTL_MS = 30_000;
const SWEEP_INTERVAL_MS = 60_000;
const WRITE_METHODS = [
	"set",
	"update",
	"delete",
	"push",
	"pull",
	"add",
	"sub"
] as const;

interface Entry {
	value: Promise<unknown>;
	expiresAt: number;
}

// guild id (first key segment) -> key -> entry, so a write only scans the
// handful of keys cached for its own guild.
const entries = new Map<string, Map<string, Entry>>();

setInterval(() => {
	const now = Date.now();
	for (const [scope, keys] of entries) {
		for (const [key, entry] of keys) {
			if (entry.expiresAt <= now) keys.delete(key);
		}
		if (keys.size === 0) entries.delete(scope);
	}
}, SWEEP_INTERVAL_MS).unref();

function scopeOf(key: string): string {
	const dot = key.indexOf(".");
	return dot === -1 ? key : key.slice(0, dot);
}

function overlaps(a: string, b: string): boolean {
	return a === b || a.startsWith(`${b}.`) || b.startsWith(`${a}.`);
}

function clone<T>(value: T): T {
	return value !== null && typeof value === "object"
		? structuredClone(value)
		: value;
}

/** `client.db.get(key)` served from the cache for `ttlMs`. */
export function getCachedGuildValue<T = any>(
	key: string,
	ttlMs: number = DEFAULT_TTL_MS
): Promise<T | null> {
	const scope = scopeOf(key);
	let keys = entries.get(scope);
	const hit = keys?.get(key);
	if (hit && hit.expiresAt > Date.now()) {
		return hit.value.then((value) => clone(value as T | null));
	}

	if (!keys) {
		keys = new Map();
		entries.set(scope, keys);
	}
	const value = (client.db.get(key) as Promise<T | null>).then(
		(result) => result ?? null
	);
	const entry: Entry = { value, expiresAt: Date.now() + ttlMs };
	keys.set(key, entry);
	// Never keep a failed read.
	value.catch(() => {
		if (keys.get(key) === entry) keys.delete(key);
	});

	return value.then((result) => clone(result));
}

export function invalidateGuildValue(key: string): void {
	const keys = entries.get(scopeOf(key));
	if (!keys) return;
	for (const cached of keys.keys()) {
		if (overlaps(cached, key)) keys.delete(cached);
	}
}

/** Hooks the write methods of the main database so the cache never lags. */
export function installGuildConfigCache(db: UnifiedDatabase): void {
	const target = db as unknown as Record<string, unknown>;
	for (const method of WRITE_METHODS) {
		const original = target[method];
		if (typeof original !== "function") continue;

		target[method] = function (
			this: unknown,
			key: unknown,
			...args: unknown[]
		) {
			if (typeof key !== "string")
				return original.call(this, key, ...args);

			invalidateGuildValue(key);
			const result = original.call(
				this,
				key,
				...args
			) as Promise<unknown>;
			// A read started during the write must not stay cached.
			return Promise.resolve(result).finally(() =>
				invalidateGuildValue(key)
			);
		};
	}
}
