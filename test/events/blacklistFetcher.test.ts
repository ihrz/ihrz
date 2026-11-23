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

const globalList: Record<string, unknown> = {};

mock.module("../../src/Events/client/ready.js", () =>
	readyTables({
		blacklistTable: {
			get: async (key: string) => globalList[key] ?? null,
			set: async () => undefined,
			delete: async () => undefined,
			has: async () => false,
			all: async () => [],
			push: async () => undefined,
			pull: async () => undefined
		}
	})
);

const { event } = await import("../../src/Events/client/blacklistFetcher.ts");

const GUILD = "100000000000000001";
const USER = "200000000000000002";

function setup(serverList: Record<string, unknown>) {
	const sent: string[] = [];
	const bans: string[] = [];
	const lang = {
		global_blacklist_msg_to_send: "global dm ${reason}",
		global_blacklist_reason: "global ban ${reason}",
		server_blacklist_msg_to_send: "server dm ${data2Reason}",
		server_blacklist_reason: "server ban ${data2Reason}"
	};
	const client = {
		func: { getLanguageData: async () => lang },
		db: { get: async (key: string) => serverList[key] ?? null }
	};
	const member = {
		id: USER,
		user: { id: USER },
		guild: {
			id: GUILD,
			members: { me: { permissions: { has: () => true } } }
		},
		send: async ({ content }: { content: string }) => {
			sent.push(content);
		},
		ban: async ({ reason }: { reason: string }) => {
			bans.push(reason);
		}
	};
	return { client, member, sent, bans };
}

test("blacklisted globally and on the server: one DM and one ban (global)", async () => {
	globalList[USER] = { blacklisted: true, reason: "spam" };
	const { client, member, sent, bans } = setup({
		[`${GUILD}.BLACKLIST.${USER}`]: { blacklisted: true, reason: "rude" }
	});

	await event.run(client as never, member as never);
	await Promise.resolve();

	expect(sent).toEqual(["global dm spam"]);
	expect(bans).toEqual(["global ban spam"]);
	delete globalList[USER];
});

test("blacklisted on the server only: the server's DM and ban", async () => {
	const { client, member, sent, bans } = setup({
		[`${GUILD}.BLACKLIST.${USER}`]: { blacklisted: true, reason: "rude" }
	});

	await event.run(client as never, member as never);
	await Promise.resolve();

	expect(sent).toEqual(["server dm rude"]);
	expect(bans).toEqual(["server ban rude"]);
});
