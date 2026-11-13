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

// Each user's playlists and liked tracks (musicLibrary.ts), on the memory driver.
import { afterAll, beforeEach, describe, expect, test } from "bun:test";

import { Memory } from "../../src/core/database/driver/memory.ts";
import { initTables, resetTables } from "../../src/core/database/tables.ts";
import * as lib from "../../src/core/modules/musicLibrary.ts";

const U = "300000000000000000";
const OTHER = "300000000000000001";

const track = (n: number, over: Record<string, unknown> = {}) =>
	lib.toLibraryTrack({
		encoded: `enc-${n}`,
		info: {
			identifier: `id${n}`,
			title: `Song ${n}`,
			author: "Artist",
			uri: `https://deezer.com/track/${n}`,
			artworkUrl: n % 2 ? `https://img/${n}.jpg` : null,
			duration: 1000 * n,
			isStream: false,
			isSeekable: true,
			sourceName: "deezer",
			isrc: null,
			...over
		}
	} as never)!;

beforeEach(async () => {
	resetTables();
	await initTables({ db: new Memory() } as never, ["musicLibraryTable"]);
	lib.__libraryTest.keysCache.clear();
});
afterAll(() => resetTables());

describe("playlists", () => {
	test("create, list, add (no duplicates), move, remove, rename, delete", async () => {
		const p = await lib.createPlaylist(U, "  Road   trip  ", [track(1)]);
		expect(p.name).toBe("Road trip");
		expect(p.id).toMatch(/^[0-9a-f]{8}$/);
		expect(p.count).toBe(1);
		expect(p.cover).toBe("https://img/1.jpg");

		const added = await lib.addToPlaylist(U, p.id, [
			track(2),
			track(1),
			track(3),
			track(3)
		]);
		expect(added.result).toEqual({ added: 2, skipped: 0 });
		expect(added.playlist.count).toBe(3);
		expect(added.playlist.duration).toBe(6000);

		await lib.movePlaylistTrack(U, p.id, 2, 0);
		let { tracks } = await lib.playlistTracks(U, p.id);
		expect(tracks.map((t) => t.identifier)).toEqual(["id3", "id1", "id2"]);

		await lib.removeFromPlaylist(U, p.id, "deezer:id1");
		({ tracks } = await lib.playlistTracks(U, p.id));
		expect(tracks.map((t) => t.identifier)).toEqual(["id3", "id2"]);

		expect((await lib.renamePlaylist(U, p.id, "Night")).name).toBe("Night");
		expect((await lib.listPlaylists(U)).map((x) => x.name)).toEqual([
			"Night"
		]);
		// Someone else's library is another one.
		expect(await lib.listPlaylists(OTHER)).toEqual([]);
		await expect(lib.playlistTracks(OTHER, p.id)).rejects.toThrow(
			"playlist not found"
		);

		await lib.deletePlaylist(U, p.id);
		expect(await lib.listPlaylists(U)).toEqual([]);
	});

	test("names: required, unique without case", async () => {
		await expect(lib.createPlaylist(U, "   ")).rejects.toThrow(
			"needs a name"
		);
		await lib.createPlaylist(U, "Chill");
		await expect(lib.createPlaylist(U, "chill")).rejects.toThrow(
			"already has this name"
		);
	});

	test("at most 20 playlists, 400 tracks each", async () => {
		for (let i = 0; i < lib.MAX_PLAYLISTS; i++)
			await lib.createPlaylist(U, `P${i}`);
		await expect(lib.createPlaylist(U, "one more")).rejects.toThrow(
			"at most 20 playlists"
		);

		const [first] = await lib.listPlaylists(U);
		const many = Array.from({ length: 450 }, (_, i) => track(i + 1));
		const r = await lib.addToPlaylist(U, first!.id, many);
		expect(r.result).toEqual({ added: 400, skipped: 50 });
		await expect(
			lib.addToPlaylist(U, first!.id, [track(999)])
		).rejects.toThrow("at most 400 tracks");
		// Already there: nothing to refuse.
		expect(
			(await lib.addToPlaylist(U, first!.id, [track(1)])).result.added
		).toBe(0);
	});
});

describe("liked tracks", () => {
	test("like, unlike, pages, latest first", async () => {
		expect(await lib.setFavorite(U, track(1), true)).toBe(true);
		expect(await lib.setFavorite(U, track(1), true)).toBe(true); // once
		for (let i = 2; i <= 300; i++) await lib.setFavorite(U, track(i), true);
		expect(await lib.favoritesCount(U)).toBe(300);
		expect((await lib.favoriteKeys(U)).has("deezer:id150")).toBe(true);

		// 300 tracks: two pages of 250 and 50, read across them.
		const page = await lib.favoritesPage(U, 45, 10);
		expect(page.count).toBe(300);
		expect(page.tracks.map((t) => t.identifier)).toEqual(
			[255, 254, 253, 252, 251, 250, 249, 248, 247, 246].map(
				(n) => `id${n}`
			)
		);

		expect(await lib.setFavorite(U, track(10), false)).toBe(false);
		await lib.removeFavorite(U, "deezer:id300");
		expect(await lib.favoritesCount(U)).toBe(298);
		expect(await lib.findFavorite(U, "deezer:id10")).toBeNull();
		expect((await lib.findFavorite(U, "deezer:id11"))?.title).toBe(
			"Song 11"
		);
		expect((await lib.favoritesPage(U, 0, 1)).tracks[0]?.identifier).toBe(
			"id299"
		);
		await expect(lib.removeFavorite(U, "deezer:nope")).rejects.toThrow(
			"track not found"
		);
	});

	test("at most 5000", async () => {
		// Fill the index directly, the way 5000 likes leave it.
		const pages: string[][] = [];
		for (let i = 0; i < lib.MAX_FAVORITES; i++) {
			if (i % lib.FAVORITES_PAGE === 0) pages.push([]);
			pages.at(-1)!.push(`x:${i}`);
		}
		const { musicLibraryTable } =
			await import("../../src/core/database/tables.ts");
		await musicLibraryTable.set(`FI_${U}`, { pages });
		await expect(lib.setFavorite(U, track(1), true)).rejects.toThrow(
			"at most 5000"
		);
	});

	test("concurrent likes of one user all land", async () => {
		await Promise.all(
			Array.from({ length: 30 }, (_, i) =>
				lib.setFavorite(U, track(i + 1), true)
			)
		);
		expect(await lib.favoritesCount(U)).toBe(30);
	});
});

describe("public links", () => {
	test("share, read through the link, unshare, and gone with the playlist", async () => {
		const p = await lib.createPlaylist(U, "Road trip", [
			track(1),
			track(2)
		]);
		const shared = await lib.setShared(U, p.id, true);
		expect(shared.shareId).toMatch(lib.SHARE_ID);
		// Sharing twice keeps the same link.
		expect((await lib.setShared(U, p.id, true)).shareId).toBe(
			shared.shareId
		);

		const seen = await lib.sharedPlaylist(shared.shareId!);
		expect(seen?.userId).toBe(U);
		expect(seen?.playlist.name).toBe("Road trip");
		expect(seen?.tracks.map((t) => t.identifier)).toEqual(["id1", "id2"]);
		// A rename or new tracks keep the link.
		await lib.renamePlaylist(U, p.id, "Night drive");
		await lib.addToPlaylist(U, p.id, [track(3)]);
		expect(
			(await lib.sharedPlaylist(shared.shareId!))?.tracks
		).toHaveLength(3);

		expect((await lib.setShared(U, p.id, false)).shareId).toBeNull();
		expect(await lib.sharedPlaylist(shared.shareId!)).toBeNull();

		const again = await lib.setShared(U, p.id, true);
		expect(again.shareId).not.toBe(shared.shareId);
		await lib.deletePlaylist(U, p.id);
		expect(await lib.sharedPlaylist(again.shareId!)).toBeNull();
	});

	test("ids: 12 letters and digits with a letter; junk is never read", async () => {
		for (let i = 0; i < 50; i++)
			expect(lib.newShareId()).toMatch(lib.SHARE_ID);
		expect(lib.SHARE_ID.test("123456789012")).toBe(false);
		expect(await lib.sharedPlaylist("../PL_x")).toBeNull();
		expect(await lib.sharedPlaylist("AAAAAAAAAAAA")).toBeNull();
	});

	test("imported names never collide", async () => {
		await lib.createPlaylist(U, "Chill");
		expect(await lib.freeName(U, "chill")).toBe("chill (2)");
		await lib.createPlaylist(U, "Chill (2)");
		expect(await lib.freeName(U, "Chill")).toBe("Chill (3)");
		expect(await lib.freeName(U, "New one")).toBe("New one");
	});
});

describe("tracks", () => {
	test("kept with what plays them again; streams and unkeyed tracks", () => {
		const t = track(3);
		expect(t.key).toBe("deezer:id3");
		expect(lib.toLavalinkTrack(t)).toMatchObject({
			encoded: "enc-3",
			info: { identifier: "id3", length: 3000, sourceName: "deezer" }
		});
		expect(track(4, { isStream: true }).duration).toBe(0);
		expect(
			lib.toLibraryTrack({ info: { identifier: "a" } } as never)
		).toBeNull();
	});
});
