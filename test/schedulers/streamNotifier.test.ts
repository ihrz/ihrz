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

import { expect, test } from "bun:test";

// StreamNotifier imports the real logger, which replaces the preload
// stand-in: put the stand-in back so later test files keep it.
const previousLogger = (globalThis as any).logger;
const { trimLastMediaNotified } =
	await import("../../src/core/StreamNotifier.ts");
(globalThis as any).logger = previousLogger;

const entry = (userId: string, n: number) => ({
	userId,
	mediaId: `${userId}-${n}`,
	timestamp: new Date(n).toISOString()
});

test("trimLastMediaNotified keeps the last entries of each user", () => {
	const list = [
		entry("a", 1),
		entry("b", 1),
		entry("a", 2),
		entry("a", 3),
		entry("b", 2)
	];

	expect(trimLastMediaNotified(list, 2)).toEqual([
		entry("b", 1),
		entry("a", 2),
		entry("a", 3),
		entry("b", 2)
	]);
});

test("trimLastMediaNotified leaves a short list untouched", () => {
	const list = [entry("a", 1), entry("b", 1)];

	expect(trimLastMediaNotified(list, 50)).toEqual(list);
	expect(trimLastMediaNotified([])).toEqual([]);
});

test("trimLastMediaNotified defaults to 50 entries per user", () => {
	const list = Array.from({ length: 80 }, (_, i) => entry("a", i));
	const result = trimLastMediaNotified(list);

	expect(result).toHaveLength(50);
	expect(result[0]).toEqual(entry("a", 30));
});
