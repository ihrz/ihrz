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

import { event } from "../../src/Events/utils/voiceTalkFreeze.ts";

const TALK = "talk";
const OTHER = "other";

function setup(records: Record<string, true> = {}) {
	const store = new Map<string, unknown>([
		["g.UTILS.VOICE_TALK", { channelId: TALK }]
	]);
	for (const id of Object.keys(records)) {
		store.set(`g.UTILS.VOICE_TALK_MUTED.${id}`, true);
	}
	const client: any = {
		db: {
			get: async (key: string) => store.get(key) ?? null,
			set: async (key: string, value: unknown) => {
				store.set(key, value);
			},
			delete: async (key: string) => {
				store.delete(key);
			}
		}
	};
	return { client, store };
}

function member(id: string, calls: boolean[]) {
	return {
		id,
		user: { bot: false },
		permissions: { has: () => false },
		voice: {
			setMute: async (mute: boolean) => {
				calls.push(mute);
			}
		}
	};
}

const guild = { id: "g", channels: { cache: new Map() } };
const state = (channelId: string | null, serverMute: boolean, m: unknown) =>
	({ channelId, serverMute, member: m, guild }) as any;

test("a member muted by the talk mode is unmuted in another channel", async () => {
	const { client, store } = setup({ u: true });
	const calls: boolean[] = [];
	const m = member("u", calls);

	await event.run(client, state(TALK, true, m), state(OTHER, true, m));

	expect(calls).toEqual([false]);
	expect(store.has("g.UTILS.VOICE_TALK_MUTED.u")).toBe(false);
});

test("a moderator mute is left alone", async () => {
	const { client } = setup();
	const calls: boolean[] = [];
	const m = member("u", calls);

	await event.run(client, state(TALK, true, m), state(OTHER, true, m));

	expect(calls).toEqual([]);
});

test("a member who left voice is unmuted when they come back", async () => {
	const { client, store } = setup({ u: true });
	const calls: boolean[] = [];
	const m = member("u", calls);

	// Left voice entirely: Discord cannot unmute them, the record stays.
	await event.run(client, state(TALK, true, m), state(null, true, m));
	expect(calls).toEqual([]);
	expect(store.has("g.UTILS.VOICE_TALK_MUTED.u")).toBe(true);

	await event.run(client, state(null, true, m), state(OTHER, true, m));
	expect(calls).toEqual([false]);
	expect(store.has("g.UTILS.VOICE_TALK_MUTED.u")).toBe(false);
});

test("a stale record is dropped without unmuting anyone", async () => {
	const { client, store } = setup({ u: true });
	const calls: boolean[] = [];
	const m = member("u", calls);

	await event.run(client, state(TALK, false, m), state(OTHER, false, m));

	expect(calls).toEqual([]);
	expect(store.has("g.UTILS.VOICE_TALK_MUTED.u")).toBe(false);
});

test("joining the talk channel mutes and records the member", async () => {
	const { client, store } = setup();
	const calls: boolean[] = [];
	const m = member("u", calls);

	await event.run(client, state(OTHER, false, m), state(TALK, false, m));

	expect(calls).toEqual([true]);
	expect(store.get("g.UTILS.VOICE_TALK_MUTED.u")).toBe(true);
});

test("the member who turned talk mode on is not muted when they come back", async () => {
	const { client, store } = setup();
	store.set("g.UTILS.VOICE_TALK", { channelId: TALK, enabledBy: "host" });
	const calls: boolean[] = [];
	const m = member("host", calls);

	await event.run(client, state(OTHER, false, m), state(TALK, false, m));

	expect(calls).toEqual([]);
	expect(store.has("g.UTILS.VOICE_TALK_MUTED.host")).toBe(false);
});

function freezeSetup(enabledBy: string, allowedUsers: string[] = []) {
	const { client, store } = setup();
	store.delete("g.UTILS.VOICE_TALK");
	store.set("g.UTILS.VOICE_FREEZE", {
		channelId: TALK,
		enabledBy,
		allowedUsers
	});
	const frozen = { type: 2, members: { size: 1 } };
	const frozenGuild = {
		id: "g",
		channels: { cache: new Map([[TALK, frozen]]) }
	};
	const at = (channelId: string | null, m: unknown) =>
		({
			channelId,
			serverMute: false,
			member: m,
			guild: frozenGuild
		}) as any;
	return { client, store, at };
}

function freezeMember(id: string, log: string[], timeoutFails = false) {
	const m: any = {
		id,
		user: { bot: false },
		permissions: { has: () => false },
		voice: {
			channelId: TALK,
			setChannel: async () => {
				log.push("disconnect");
			}
		},
		timeout: async () => {
			log.push("timeout");
			if (timeoutFails) throw new Error("Missing Permissions");
		}
	};
	return m;
}

test("a frozen channel disconnects whoever is not allowed", async () => {
	const { client, at } = freezeSetup("host");
	const log: string[] = [];
	const m = freezeMember("u", log);

	await event.run(client, at(OTHER, m), at(TALK, m));

	expect(log).toEqual(["disconnect", "timeout"]);
});

test("the member who froze the channel can come back in", async () => {
	const { client, at } = freezeSetup("host");
	const log: string[] = [];
	const m = freezeMember("host", log);

	await event.run(client, at(OTHER, m), at(TALK, m));

	expect(log).toEqual([]);
});

test("a refused short timeout does not throw out of the freeze", async () => {
	const { client, at } = freezeSetup("host");
	const log: string[] = [];
	const m = freezeMember("u", log, true);

	await event.run(client, at(OTHER, m), at(TALK, m));

	expect(log).toEqual(["disconnect", "timeout"]);
});
