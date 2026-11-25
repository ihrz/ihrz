import { describe, expect, test } from "bun:test";

import {
	SELECT_MAX_OPTIONS,
	utcSelectMenus
} from "../../src/core/functions/utcSelect.ts";
import { utcTimezones } from "../../src/core/locales.ts";

describe("night mode time zone menus", () => {
	const menus = utcSelectMenus("Choose UTC", 1).map((m) => m.toJSON());

	test("each menu fits Discord's limit of 25 options", () => {
		for (const m of menus)
			expect(m.options.length).toBeLessThanOrEqual(SELECT_MAX_OPTIONS);
	});

	test("every zone is offered exactly once, in order", () => {
		const values = menus.flatMap((m) =>
			m.options.map((o) => Number(o.value))
		);
		const all = Object.keys(utcTimezones)
			.map(Number)
			.sort((a, b) => a - b);
		expect(values).toEqual(all);
		expect(all.length).toBeGreaterThan(SELECT_MAX_OPTIONS);
	});

	test("the current zone is preselected, the range is in the placeholder", () => {
		const selected = menus.flatMap((m) =>
			m.options.filter((o) => o.default)
		);
		expect(selected.map((o) => o.value)).toEqual(["1"]);
		expect(menus[0]!.placeholder).toContain("UTC-11");
		expect(menus[1]!.placeholder).toContain("UTC+14");
		expect(menus.map((m) => m.custom_id)).toEqual([
			"utc_choice_west",
			"utc_choice_east"
		]);
	});
});
