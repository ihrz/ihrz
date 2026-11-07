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

import { describe, expect, test } from "bun:test";
import {
	get_property,
	set_property,
	unset_property,
} from "../../src/core/database/lodash";

describe("database lodash helpers", () => {
	test("set_property rejects __proto__ segments", () => {
		set_property({}, "__proto__.polluted", true);
		set_property({}, "a.__proto__.polluted", true);
		expect(({} as any).polluted).toBeUndefined();
	});

	test("set_property rejects constructor.prototype segments", () => {
		set_property({}, "constructor.prototype.polluted", true);
		expect(({} as any).polluted).toBeUndefined();
	});

	test("unset_property does not walk reserved segments", () => {
		(Object.prototype as any).keep = 1;
		try {
			expect(unset_property({}, "__proto__.keep")).toBe(false);
			expect(unset_property({}, "constructor.prototype.keep")).toBe(false);
			expect(({} as any).keep).toBe(1);
		} finally {
			delete (Object.prototype as any).keep;
		}
	});

	test("get_property does not return inherited values", () => {
		expect(get_property({}, "__proto__", "d")).toBeUndefined();
		expect(get_property({}, "constructor.name", "d")).toBeUndefined();
		expect(get_property({ a: 1 }, "toString", "d")).toBe("d");
	});

	test("nested paths still work", () => {
		const obj: any = {};
		set_property(obj, "a.b.c", 1);
		expect(obj).toEqual({ a: { b: { c: 1 } } });
		expect(get_property(obj, "a.b.c")).toBe(1);
		expect(get_property(obj, "a.x", "d")).toBe("d");
		expect(unset_property(obj, "a.b.c")).toBe(true);
		expect(get_property(obj, "a.b.c")).toBeNull();
	});
});
