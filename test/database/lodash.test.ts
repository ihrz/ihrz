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
	is_safe_key_segment,
	set_property,
	unset_property
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
			expect(unset_property({}, "constructor.prototype.keep")).toBe(
				false
			);
			expect(({} as any).keep).toBe(1);
		} finally {
			delete (Object.prototype as any).keep;
		}
	});

	test("get_property treats reserved and inherited keys as missing", () => {
		expect(get_property({}, "__proto__", "d")).toBe("d");
		expect(get_property({}, "constructor.name", "d")).toBe("d");
		expect(get_property({ a: 1 }, "toString", "d")).toBe("d");
	});

	test("unset_property stops on a null or non-object segment", () => {
		expect(unset_property({ a: { b: null } }, "a.b.c")).toBe(false);
		expect(unset_property({ a: 1 }, "a.b")).toBe(false);
	});

	test("is_safe_key_segment", () => {
		for (const ok of [
			"règles",
			"café",
			"ルール",
			"правила",
			"gg!",
			"a_b-c"
		]) {
			expect(is_safe_key_segment(ok)).toBe(true);
		}
		for (const bad of [
			"",
			"a.b",
			".",
			"__proto__",
			"constructor",
			"prototype"
		]) {
			expect(is_safe_key_segment(bad)).toBe(false);
		}
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
