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

import { EmojisManager } from "../../src/core/modules/emojisManager.ts";

function manager(
	appNames: string[][],
	local = ["iHorizon_Yes", "iHorizon_No"]
) {
	const m = new EmojisManager() as any;
	const calls = { created: [] as string[], json: 0, fetches: 0 };
	let round = 0;
	m.loadLocalEmojis = () => local.map((Name) => ({ Name, Extension: "png" }));
	m.fetchCurrentApplicationEmojis = async () => {
		calls.fetches++;
		const names = appNames[Math.min(round++, appNames.length - 1)];
		return names.map((Name) => ({ Name, FormatedName: `<:${Name}:1>` }));
	};
	m.createApplicationEmoji = async (e: { Name: string }) => {
		calls.created.push(e.Name);
		return `<:${e.Name}:2>`;
	};
	m.writeFinalJSON = () => calls.json++;
	m.writeInClient = () => {};
	return { m, calls };
}

test("a secondary shard never creates emojis nor writes emojis.json", async () => {
	const { m, calls } = manager([["iHorizon_Yes", "iHorizon_No"]]);
	await m.startSync({ create: false });
	expect(calls.created).toEqual([]);
	expect(calls.json).toBe(0);
	expect(m.final_appEmojis).toEqual({
		Yes: "<:iHorizon_Yes:1>",
		No: "<:iHorizon_No:1>"
	});
});

test("an emoji the main shard has not created yet is picked up later", async () => {
	const { m, calls } = manager([
		["iHorizon_Yes"],
		["iHorizon_Yes"],
		["iHorizon_Yes", "iHorizon_No"]
	]);
	m.waitForMissing = (
		(original) => (missing: unknown) =>
			original.call(m, missing, 5, 1)
	)(m.waitForMissing);
	await m.startSync({ create: false });
	expect(m.final_appEmojis.No).toBeUndefined();
	await Bun.sleep(30);
	expect(m.final_appEmojis.No).toBe("<:iHorizon_No:1>");
	expect(calls.created).toEqual([]);
	expect(calls.fetches).toBe(3);
});

test("the main shard creates what is missing and writes emojis.json", async () => {
	const { m, calls } = manager([["iHorizon_Yes"]]);
	await m.startSync();
	expect(calls.created).toEqual(["iHorizon_No"]);
	expect(calls.json).toBe(1);
	expect(m.final_appEmojis.No).toBe("<:iHorizon_No:2>");
});
