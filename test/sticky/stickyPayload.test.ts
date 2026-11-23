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

const embeds: Record<string, unknown> = {
	"EMBED.KEPT": { embedOwner: "1", embedSource: { title: "Rules" } }
};

mock.module("../../src/Events/client/ready.js", () =>
	readyTables({
		metasTable: {
			get: async (key: string) => embeds[key] ?? null,
			set: async () => undefined,
			delete: async () => undefined,
			has: async () => false,
			all: async () => [],
			push: async () => undefined,
			pull: async () => undefined
		}
	})
);

const { buildStickyPayload } =
	await import("../../src/core/modules/stickyMessageManager.ts");

const config = (extra: Record<string, unknown>) =>
	({ enabled: true, ...extra }) as never;

test("text and a deleted embed: the text alone is reposted", async () => {
	expect(
		await buildStickyPayload(
			config({ content: "Read the rules", embedId: "GONE" })
		)
	).toEqual({ content: "Read the rules" });
});

test("only a deleted embed: nothing is left to post", async () => {
	expect(await buildStickyPayload(config({ embedId: "GONE" }))).toBeNull();
});

test("text and an existing embed: both are posted", async () => {
	expect(
		await buildStickyPayload(config({ content: "Hi", embedId: "KEPT" }))
	).toEqual({ content: "Hi", embeds: [{ title: "Rules" }] });
});
