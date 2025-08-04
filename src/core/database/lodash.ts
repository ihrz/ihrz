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