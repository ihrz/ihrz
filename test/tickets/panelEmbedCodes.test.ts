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

import { expect, mock, test } from "bun:test";

import { readyTables } from "../readyTables.ts";

mock.module("../../src/Events/client/ready.js", () => readyTables());

const { answerChannelPanelModal } =
	await import("../../src/Interaction/HybridCommands/ticket/!panel.ts");
const { readSavedEmbed } =
	await import("../../src/core/functions/embedHelper.ts");

// `metas` as the bot writes it: `EMBED.{code}` = { embedOwner, embedSource }.
const metas: Record<string, unknown> = {
	EMBED: {
		GOODCODE12345678: {
			embedOwner: "1",
			embedSource: { title: "Open a ticket" }
		}
	}
};
const get = async (key: string): Promise<unknown> =>
	key
		.split(".")
		.reduce<unknown>(
			(node, part) =>
				node && typeof node === "object"
					? (node as Record<string, unknown>)[part]
					: undefined,
			metas
		) ?? null;

function fakeModal() {
	const calls: string[] = [];
	return {
		calls,
		async reply(options: { content: string }) {
			if (calls.length) throw new Error("already replied");
			calls.push(`reply:${options.content}`);
		},
		async deferUpdate() {
			if (calls.length) throw new Error("already replied");
			calls.push("deferUpdate");
		}
	};
}

test("readSavedEmbed returns a saved embed", async () => {
	expect(await readSavedEmbed("GOODCODE12345678", get)).toEqual({
		embedOwner: "1",
		embedSource: { title: "Open a ticket" }
	});
});

test("readSavedEmbed refuses a code that reads inside an embed", async () => {
	// `EMBED.GOODCODE12345678.embedSource` IS an object: it was accepted, then
	// `EMBED.{code}.embedSource` was read at send time and sent nothing.
	expect(
		await readSavedEmbed("GOODCODE12345678.embedSource", get)
	).toBeNull();
	expect(await readSavedEmbed("GOODCODE12345678.", get)).toBeNull();
	expect(await readSavedEmbed("", get)).toBeNull();
	expect(await readSavedEmbed("NOPE", get)).toBeNull();
});

test("ticket channel embed: unknown code answers the modal once", async () => {
	const modal = fakeModal();
	const kept = await answerChannelPanelModal(
		modal,
		"NOPE",
		get,
		"The embed does not exist"
	);
	expect(kept).toBeUndefined();
	expect(modal.calls).toEqual(["reply:The embed does not exist"]);
});

test("ticket channel embed: a dotted code is refused, not saved", async () => {
	const modal = fakeModal();
	const kept = await answerChannelPanelModal(
		modal,
		"GOODCODE12345678.embedSource",
		get,
		"The embed does not exist"
	);
	expect(kept).toBeUndefined();
	expect(modal.calls).toEqual(["reply:The embed does not exist"]);
});

test("ticket channel embed: a known code is kept, modal deferred once", async () => {
	const modal = fakeModal();
	const kept = await answerChannelPanelModal(
		modal,
		"  GOODCODE12345678 ",
		get,
		"The embed does not exist"
	);
	expect(kept).toBe("GOODCODE12345678");
	expect(modal.calls).toEqual(["deferUpdate"]);
});
