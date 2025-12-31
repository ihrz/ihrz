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

// Native implementations of lodash functions
function get_property(obj: any, path: string, defaultValue: any = null): any {
	if (!obj) return defaultValue;
	const keys = path.split('.');
	let current = obj;

	for (const key of keys) {
		if (current === null || current === undefined || typeof current !== 'object') {
			return defaultValue;
		}
		current = current[key];
	}

	return current !== undefined ? current : defaultValue;
}

function set_property(obj: any, path: string, value: any): any {
	if (!obj || typeof obj !== 'object') obj = {};
	const keys = path.split('.');
	let current = obj;

	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		if (!current[key] || typeof current[key] !== 'object') {
			current[key] = {};
		}
		current = current[key];
	}

	current[keys[keys.length - 1]] = value;
	return obj;
}

function unset_property(obj: any, path: string): boolean {
	if (!obj) return false;
	const keys = path.split('.');
	let current = obj;

	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		if (current[key] === undefined) {
			return false;
		}
		current = current[key];
	}

	return delete current[keys[keys.length - 1]];
}

export {
	unset_property,
	get_property,
	set_property
}