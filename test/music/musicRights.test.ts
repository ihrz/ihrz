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

import { describe, expect, mock, test } from "bun:test";
import { Collection, PermissionFlagsBits } from "discord.js";

// iHorizon's owners: read from the BOT document in production.
const BOT_OWNERS = new Set(["999"]);
mock.module("../../src/core/functions/ownerHelper.js", () => ({
	isBotOwner: async (id: string) => BOT_OWNERS.has(id)
}));

const { musicRights, musicRightsOf, clearMusicQueue, removeQueuedTrack } =
	await import("../../src/core/modules/musicControls.ts");

const VC = "500";
type Fake = { id: string; perms?: bigint[]; vc?: string | null; bot?: boolean };

function server(listeners: Fake[], owner = "1") {
	const guild: any = { id: "g", ownerId: owner, members: {} };
	const make = (f: Fake): any => ({
		id: f.id,
		guild,
		user: { id: f.id, bot: !!f.bot },
		permissions: { has: (p: bigint) => (f.perms ?? []).includes(p) },
		voice: {
			channelId: f.vc === undefined ? VC : f.vc,
			channel: (f.vc === undefined ? VC : f.vc) ? { id: VC } : null
		}
	});
	const members = new Collection<string, any>();
	for (const f of listeners) members.set(f.id, make(f));
	members.set("bot", make({ id: "bot", bot: true }));
	guild.members.me = {
		voice: { channelId: VC, channel: { id: VC, members } }
	};
	return {
		guild,
		member: (id: string) => members.get(id) ?? make({ id, vc: null })
	};
}

const track = (id: string, requester: string | null) => ({
	info: { identifier: id, title: `Title ${id}` },
	requester: requester ? { id: requester } : null
});

function player(current: string | null, queue: [string, string | null][] = []) {
	const tracks = queue.map(([id, by]) => track(id, by));
	return {
		playing: true,
		queue: {
			current: current === null ? null : track("now", current),
			tracks,
			splice: async (i: number, n: number) => tracks.splice(i, n)
		}
	} as any;
}
const clientWith = (p: any) => ({ player: { getPlayer: () => p } }) as any;

describe("music rights", () => {
	test("managers: the owner, Administrator, Manage Server, iHorizon's owners", async () => {
		const { member } = server([
			{ id: "1" },
			{ id: "2", perms: [PermissionFlagsBits.Administrator] },
			{ id: "3", perms: [PermissionFlagsBits.ManageGuild] },
			{ id: "999" },
			{ id: "4", perms: [PermissionFlagsBits.ManageChannels] }
		]);
		const p = player("5");
		for (const id of ["1", "2", "3", "999"])
			expect((await musicRights(member(id), p)).manager).toBe(true);
		expect((await musicRights(member("4"), p)).manager).toBe(false);
	});

	test("the track playing: its requester, not the other listeners", () => {
		const { member } = server([{ id: "10" }, { id: "11" }]);
		const p = player("10");
		expect(musicRightsOf(member("10"), p, false)).toEqual({
			manager: false,
			current: true
		});
		expect(musicRightsOf(member("11"), p, false)).toEqual({
			manager: false,
			current: false
		});
	});

	test("the requester left the channel, or there is none: anyone's", () => {
		const { member } = server([{ id: "10" }, { id: "11" }]);
		expect(musicRightsOf(member("11"), player("42"), false).current).toBe(
			true
		);
		expect(musicRightsOf(member("11"), player(null), false).current).toBe(
			true
		);
	});

	test("alone with the bot: a manager", () => {
		const { member } = server([{ id: "10" }]);
		expect(musicRightsOf(member("10"), player("42"), false)).toEqual({
			manager: true,
			current: true
		});
	});
});

describe("the queue", () => {
	test("clear-queue: a listener removes their own tracks, a manager everything", async () => {
		const { member } = server([
			{ id: "10" },
			{ id: "11" },
			{ id: "3", perms: [PermissionFlagsBits.ManageGuild] }
		]);
		const p = player("11", [
			["a", "10"],
			["b", "11"],
			["c", "10"],
			["d", null]
		]);
		const mine = await clearMusicQueue(clientWith(p), member("10"));
		expect(mine).toEqual({ ok: true, removed: 2, own: true });
		expect(p.queue.tracks.map((t: any) => t.info.identifier)).toEqual([
			"b",
			"d"
		]);
		const all = await clearMusicQueue(clientWith(p), member("3"));
		expect(all).toEqual({ ok: true, removed: 2, own: false });
		expect(p.queue.tracks).toEqual([]);
	});

	test("remove: one's own track, or any for a manager; checks the queue did not move", async () => {
		const { member } = server([
			{ id: "10" },
			{ id: "11" },
			{ id: "2", perms: [PermissionFlagsBits.Administrator] }
		]);
		const p = player("11", [
			["a", "10"],
			["b", "11"]
		]);
		expect(
			await removeQueuedTrack(clientWith(p), member("10"), 1, "b")
		).toEqual({ ok: false, reason: "requester_only" });
		expect(
			await removeQueuedTrack(clientWith(p), member("10"), 0, "zz")
		).toEqual({ ok: false, reason: "queue_changed" });
		expect(
			await removeQueuedTrack(clientWith(p), member("10"), 7, null)
		).toEqual({ ok: false, reason: "track_not_found" });
		expect(
			await removeQueuedTrack(clientWith(p), member("10"), 0, "a")
		).toEqual({ ok: true, title: "Title a" });
		expect(
			await removeQueuedTrack(clientWith(p), member("2"), 0, "b")
		).toEqual({ ok: true, title: "Title b" });
		expect(p.queue.tracks).toEqual([]);
	});

	test("outside the bot's voice channel: nothing", async () => {
		const { member } = server([{ id: "10" }]);
		const p = player("10", [["a", "10"]]);
		expect(
			await removeQueuedTrack(clientWith(p), member("77"), 0, "a")
		).toEqual({ ok: false, reason: "nothing_playing" });
	});
});
