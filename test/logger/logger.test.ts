/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

*/

import { afterAll, expect, test } from "bun:test";

const previous = (globalThis as any).logger;
const { default: logger } = await import("../../src/core/logger.js");

// Importing the real logger replaces the preload stand-in: put it back.
afterAll(() => {
	(globalThis as any).logger = previous;
});

test("logger: an Error is rendered with its message and stack", () => {
	const out = logger.returnLog("failed:", new Error("boom"));

	expect(out).toContain("failed:");
	expect(out).toContain("Error: boom");
	expect(out).toContain("\n    at ");
});

test("logger: an Error as the message is rendered with its stack", () => {
	const out = logger.returnLog(new Error("boom"));

	expect(out).toContain("boom");
	expect(out).toContain("\n    at ");
});

test("logger: an Error without a stack falls back to name and message", () => {
	const error = new TypeError("no stack");
	error.stack = undefined;

	expect(logger.returnLog(error)).toContain("TypeError: no stack");
});

test("logger: a circular object does not throw", () => {
	const circular: any = { name: "loop" };
	circular.self = circular;

	expect(() => logger.returnLog("circular:", circular)).not.toThrow();
	expect(logger.returnLog(circular)).toContain("loop");
});

test("logger: plain objects and strings keep their format", () => {
	const out = logger.returnLog("data", { a: 1 });

	expect(out).toContain('"a": 1');
	expect(out).toContain("data");
});
