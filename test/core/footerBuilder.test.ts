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

import { afterEach, expect, test } from "bun:test";

import { footerBuilder } from "../../src/core/functions/displayBotName";

const reads: string[] = [];

// HorizonDB's rule (db/src/values.rs, parse_key): an empty segment is a "malformed key".
(globalThis as any).client = {
	db: {
		get: async (key: string) => {
			reads.push(key);
			if (key.split(".").some((s) => !s))
				throw new Error("HorizonDBOpError: malformed key");
			return key === "1554502642938675241.BOT.botName" ? "Ora" : null;
		}
	}
};

afterEach(() => {
	reads.length = 0;
});

test("outside a server (/fun in DMs or as a user app) the footer never asks the database", async () => {
	for (const id of ["", null, undefined]) {
		expect((await footerBuilder(id)).text).toBe("iHorizon");
	}
	expect(reads).toEqual([]);
});

test("in a server the custom bot name is used", async () => {
	expect((await footerBuilder("1554502642938675241")).text).toBe("Ora");
	expect((await footerBuilder("1")).text).toBe("iHorizon");
});
