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

import { iHorizonTimeCalculator } from "../../src/core/functions/ms.ts";

const calc = new iHorizonTimeCalculator();

describe("to_ms", () => {
	test("parses common durations", () => {
		expect(calc.to_ms("1h")).toBe(3_600_000);
		expect(calc.to_ms("1h30m")).toBe(5_400_000);
		expect(calc.to_ms("1.5h")).toBe(5_400_000);
		expect(calc.to_ms(".5s")).toBe(500);
		expect(calc.to_ms("2 days")).toBe(172_800_000);
		expect(calc.to_ms("10min")).toBe(600_000);
	});

	test("refuses long input quickly", () => {
		const started = performance.now();
		expect(calc.to_ms("1".repeat(4000) + "!")).toBe(0);
		expect(calc.to_ms("1".repeat(60) + "!")).toBe(0);
		expect(performance.now() - started).toBeLessThan(50);
	});
});
