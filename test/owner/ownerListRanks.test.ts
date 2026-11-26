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

// Inside a server's owner list, only the Discord owner removes an owner
// (/unowner) or blacklists / edits the blacklist entry of an owner.

import { readyTables } from "../readyTables.ts";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { LanguageData } from "../../types/languageData.ts";

mock.module("../../src/Events/client/ready.js", () => readyTables());

const ownerHelper = await import("../../src/core/functions/ownerHelper.ts");
const unowner =
	await import("../../src/Interaction/HybridCommands/owner/unowner.ts");
const blacklist =
	await import("../../src/Interaction/HybridCommands/owner/blacklist.ts");
const bledit =
	await import("../../src/Interaction/HybridCommands/owner/bledit.ts");

const GUILD = "100000000000000000";
const DISCORD_OWNER = "200000000000000000";
const LISTED_A = "300000000000000000";
const LISTED_B = "310000000000000000";
const REGULAR = "400000000000000000";

const lang = new Proxy({} as LanguageData, {
	get: (_t, key) => String(key)
});

let store: Map<string, unknown>;
let sent: string[];

function user(id: string) {
	return { id, username: `u${id}`, globalName: null };
}

function run(actor: string, target: string) {
	const client = {
		user: { id: "1" },
		db: {
			get: async (key: string) => {
				if (key === `${GUILD}.OWNER`) {
					return {
						[LISTED_A]: { owner: true },
						[LISTED_B]: { owner: true }
					};
				}
				return store.get(key) ?? null;
			},
			set: async (key: string, value: unknown) => {
				store.set(key, value);
			},
			delete: async (key: string) => {
				store.set(key, "deleted");
			}
		},
		owners: [],
		iHorizon_Emojis: {},
		func: {
			ownerHelper,
			method: {
				options: () => ({
					user: async () => user(target),
					longString: () => "new reason"
				}),
				interactionSend: async (
					_i: unknown,
					msg: { content?: string }
				) => {
					sent.push(msg.content ?? "embed");
					return {};
				}
			},
			displayBotName: {
				footerBuilder: async () => ({ text: "x" }),
				footerAttachmentBuilder: async () => ({})
			}
		}
	};
	(globalThis as { client?: unknown }).client = client;
	const interaction = {
		client,
		guildId: GUILD,
		channel: {},
		member: { user: user(actor) },
		guild: {
			id: GUILD,
			ownerId: DISCORD_OWNER,
			members: { cache: new Map() }
		}
	};
	// Partial mocks: only what the commands read.
	return { client: client as never, interaction: interaction as never };
}

beforeEach(() => {
	store = new Map();
	sent = [];
});

afterEach(() => {
	delete (globalThis as { client?: unknown }).client;
});

describe("/unowner (server mode)", () => {
	test("an owner list member can't remove another owner", async () => {
		const { client, interaction } = run(LISTED_A, LISTED_B);
		await unowner.run_for_guild_owner(client, interaction, lang);
		expect(sent).toEqual(["owner_list_only_discord_owner"]);
		expect(store.get(`${GUILD}.OWNER.${LISTED_B}`)).toBeUndefined();
	});

	test("the Discord owner can", async () => {
		const { client, interaction } = run(DISCORD_OWNER, LISTED_B);
		await unowner.run_for_guild_owner(client, interaction, lang);
		expect(sent).toEqual(["unowner_command_work"]);
		expect(store.get(`${GUILD}.OWNER.${LISTED_B}`)).toBe("deleted");
	});

	test("nobody removes the Discord owner", async () => {
		const { client, interaction } = run(LISTED_A, DISCORD_OWNER);
		await unowner.run_for_guild_owner(client, interaction, lang);
		expect(sent).toEqual(["unowner_cant_unowner_creator"]);
	});
});

describe("/blacklist (server mode)", () => {
	test("an owner list member can't blacklist another owner", async () => {
		const { client, interaction } = run(LISTED_A, LISTED_B);
		await blacklist.run_for_guild_owner(client, interaction, lang);
		expect(sent).toEqual(["owner_list_only_discord_owner"]);
		expect(store.has(`${GUILD}.BLACKLIST.${LISTED_B}`)).toBe(false);
	});

	test("an owner list member still blacklists a regular member", async () => {
		const { client, interaction } = run(LISTED_A, REGULAR);
		await blacklist.run_for_guild_owner(client, interaction, lang);
		expect(sent).toEqual(["blacklist_command_work"]);
		expect(store.get(`${GUILD}.BLACKLIST.${REGULAR}`)).toMatchObject({
			blacklisted: true,
			owner: LISTED_A
		});
	});

	test("the Discord owner can blacklist an owner", async () => {
		const { client, interaction } = run(DISCORD_OWNER, LISTED_B);
		await blacklist.run_for_guild_owner(client, interaction, lang);
		expect(sent).toEqual(["blacklist_command_work"]);
	});

	test("nobody blacklists the Discord owner, even uncached", async () => {
		const { client, interaction } = run(LISTED_A, DISCORD_OWNER);
		await blacklist.run_for_guild_owner(client, interaction, lang);
		expect(sent).toEqual(["unowner_cant_unowner_creator"]);
		expect(store.has(`${GUILD}.BLACKLIST.${DISCORD_OWNER}`)).toBe(false);
	});
});

describe("/bledit (server mode)", () => {
	test("an owner list member can't edit an owner's entry", async () => {
		const { client, interaction } = run(LISTED_A, LISTED_B);
		store.set(`${GUILD}.BLACKLIST.${LISTED_B}`, { reason: "old" });
		await bledit.run_for_guild_owner(client, interaction, lang);
		expect(sent).toEqual(["owner_list_only_discord_owner"]);
		expect(store.has(`${GUILD}.BLACKLIST.${LISTED_B}.reason`)).toBe(false);
	});

	test("the Discord owner can, and others still edit regular entries", async () => {
		store.set(`${GUILD}.BLACKLIST.${LISTED_B}`, { reason: "old" });
		const owner = run(DISCORD_OWNER, LISTED_B);
		await bledit.run_for_guild_owner(owner.client, owner.interaction, lang);
		expect(store.has(`${GUILD}.BLACKLIST.${LISTED_B}.reason`)).toBe(true);

		store.set(`${GUILD}.BLACKLIST.${REGULAR}`, { reason: "old" });
		const listed = run(LISTED_A, REGULAR);
		await bledit.run_for_guild_owner(
			listed.client,
			listed.interaction,
			lang
		);
		expect(store.has(`${GUILD}.BLACKLIST.${REGULAR}.reason`)).toBe(true);
	});
});
