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

// /utils leash: the limit and its message follow UTILS.LEASH_CONFIG, expired
// leashes don't count, and the "not in voice" prompt only shows when the
// member really isn't in voice.

import { expect, mock, test } from "bun:test";

import enUS from "../../src/lang/en-US.ts";

const prompts: string[] = [];
mock.module("../../src/core/functions/awaitingResponse.js", () => ({
	default: async (_i: unknown, opts: { content: string }) => {
		prompts.push(opts.content);
		return true;
	}
}));

const { subCommand: leash } =
	await import("../../src/Interaction/HybridCommands/utils/!leash.ts");

const MIN = 60_000;

function run(
	leashes: unknown[],
	config: unknown,
	targetInVoice: boolean
): Promise<{ sent: string[]; store: Map<string, unknown> }> {
	const store = new Map<string, unknown>([["g.UTILS.LEASH", leashes]]);
	if (config) store.set("g.UTILS.LEASH_CONFIG", config);
	const sent: string[] = [];
	const target = {
		id: "sub",
		voice: { channel: targetInVoice ? { id: "vc" } : null }
	};
	const client: any = {
		user: {},
		db: {
			get: async (key: string) => store.get(key) ?? null,
			set: async (key: string, value: unknown) => {
				store.set(key, value);
			}
		},
		timeCalculator: { to_ms: () => 30 * MIN },
		iHorizon_Emojis: { Yes: "Y", No: "N", Warning_Icon: "W" },
		func: {
			method: {
				options: () => ({ member: () => target }),
				interactionSend: async (
					_i: unknown,
					p: { content: string }
				) => {
					sent.push(p.content);
				}
			}
		}
	};
	const interaction: any = {
		guildId: "g",
		guild: { id: "g" },
		channel: {},
		member: { user: { id: "dom" }, voice: { channel: { id: "vc" } } }
	};
	return leash
		.run(client, interaction, enUS as any, [])
		.then(() => ({ sent, store }));
}

const held = (n: number, ageMin = 0) =>
	Array.from({ length: n }, (_, i) => ({
		dom: "dom",
		sub: `s${i}`,
		timestamp: Date.now() - ageMin * MIN
	}));

test("the limit message shows the configured maximum", async () => {
	const { sent } = await run(held(2), { maxLeashedByUsers: 2 }, true);
	expect(sent).toEqual([
		"You little rascal, you can't leash more than 2 people :D"
	]);
});

test("expired leashes don't count toward the limit", async () => {
	prompts.length = 0;
	const { sent, store } = await run(held(3, 40), null, true);
	expect(sent[0]).toContain("successfully leashed");
	// The expired ones are dropped, the new one is kept.
	expect(store.get("g.UTILS.LEASH")).toMatchObject([
		{ dom: "dom", sub: "sub" }
	]);
	// Both in voice: no "isn't in a voice channel" prompt.
	expect(prompts).toEqual([]);
});

test("leashing a member who isn't in voice asks first", async () => {
	prompts.length = 0;
	await run([], null, false);
	expect(prompts.length).toBe(1);
	expect(prompts[0]).toContain("isn't in a voice channel");
});
