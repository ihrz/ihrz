/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import path from 'node:path';
import fs from "node:fs";

const cache_storage_path = path.join(process.cwd(), "src", "files", ".ihrz-cache");
const format = { format: "2025-07" };

// Internal storage object
let _cache_storage_data: any = {};

// Debounce to avoid excessive saves
let saveTimeout: NodeJS.Timeout | null = null;
const SAVE_DELAY = 50; // 50ms debounce

// Auto-save function with debouncing
const cache_storage_update = () => {
	fs.writeFileSync(cache_storage_path, JSON.stringify(_cache_storage_data, null, 4));
};

const debouncedSave = () => {
	if (saveTimeout) clearTimeout(saveTimeout);
	saveTimeout = setTimeout(cache_storage_update, SAVE_DELAY);
};

// WeakMap to track already proxified objects (prevents infinite loops)
const proxifiedObjects = new WeakMap();

// Recursive proxy creator
const createDeepAutoSaveProxy = (target: any, path: string[] = []): any => {
	// Don't proxy primitives
	if (target === null || typeof target !== 'object') {
		return target;
	}

	// Return existing proxy if already proxified
	if (proxifiedObjects.has(target)) {
		return proxifiedObjects.get(target);
	}

	// Create proxy for objects and arrays
	const proxy = new Proxy(target, {
		set(obj, prop, value) {
			// Proxify new nested objects/arrays
			if (value !== null && typeof value === 'object') {
				value = createDeepAutoSaveProxy(value, [...path, String(prop)]);
			}

			// Set the property
			obj[prop] = value;

			// Trigger auto-save
			debouncedSave();

			return true;
		},

		deleteProperty(obj, prop) {
			// Delete the property
			delete obj[prop];

			// Trigger auto-save
			debouncedSave();

			return true;
		},

		get(obj, prop) {
			const value = obj[prop];

			// Return proxified version for nested objects/arrays
			if (value !== null && typeof value === 'object' && !proxifiedObjects.has(value)) {
				const proxifiedValue = createDeepAutoSaveProxy(value, [...path, String(prop)]);
				obj[prop] = proxifiedValue;
				return proxifiedValue;
			}

			return value;
		}
	});

	// Store the proxy to prevent re-proxification
	proxifiedObjects.set(target, proxy);

	// Recursively proxify existing nested objects/arrays
	for (const [key, value] of Object.entries(target)) {
		if (value !== null && typeof value === 'object') {
			target[key] = createDeepAutoSaveProxy(value, [...path, key]);
		}
	}

	return proxy;
};

// Initialize cache file if it doesn't exist
if (!fs.existsSync(cache_storage_path)) {
	fs.writeFileSync(cache_storage_path, JSON.stringify(format, null, 4));
	_cache_storage_data = { ...format };
} else {
	_cache_storage_data = JSON.parse(fs.readFileSync(cache_storage_path, 'utf-8'));

	if (_cache_storage_data?.["format"] !== "2025-07") {
		_cache_storage_data = { ...format };
		cache_storage_update();
	}
}

// Export the deep proxied version that auto-saves on any nested modification
export const cache_storage_data = createDeepAutoSaveProxy(_cache_storage_data);