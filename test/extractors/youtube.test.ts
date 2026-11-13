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

import { describe, expect, test } from "bun:test";

import {
	playlistTracks,
	splitTitle,
	youtubeListId,
	youtubePlaylist,
	youtubeVideoId
} from "../../src/core/extractors/youtube/index.js";

describe("youtube: links", () => {
	test("playlist and video ids", () => {
		const url =
			"https://www.youtube.com/watch?v=TsvL2poCHug&list=PLKKM-o5LHrqpi3I2grem6JAF7dj367wYE&index=2";
		expect(youtubeListId(url)).toBe("PLKKM-o5LHrqpi3I2grem6JAF7dj367wYE");
		expect(youtubeVideoId(url)).toBe("TsvL2poCHug");
		expect(
			youtubeListId("https://music.youtube.com/playlist?list=OLAK5uy_abc")
		).toBe("OLAK5uy_abc");
		expect(youtubeVideoId("https://youtu.be/u5CVsCnxyXg?si=x")).toBe(
			"u5CVsCnxyXg"
		);
		expect(
			youtubeVideoId("https://www.youtube.com/shorts/u5CVsCnxyXg")
		).toBe("u5CVsCnxyXg");
		expect(youtubeListId("https://evil.example/watch?list=PLx")).toBeNull();
		expect(
			youtubeVideoId("https://www.youtube.com/watch?v=short")
		).toBeNull();
	});
});

describe("youtube: titles", () => {
	test("artist - title, noise removed, channel as the artist otherwise", () => {
		expect(
			splitTitle("Radiohead - Fake Plastic Trees [HQ]", "SalvaMuñox")
		).toEqual({ artist: "Radiohead", title: "Fake Plastic Trees" });
		expect(
			splitTitle("Kyo - Dernière danse (Clip officiel)", "Kyo")
		).toEqual({ artist: "Kyo", title: "Dernière danse" });
		expect(
			splitTitle(
				"Icona Pop - I Love It (feat. Charli XCX) [OFFICIAL VIDEO]",
				"Icona Pop"
			)
		).toEqual({
			artist: "Icona Pop",
			title: "I Love It (feat. Charli XCX)"
		});
		expect(splitTitle("Party Rock Anthem", "LMFAO - Topic")).toEqual({
			artist: "LMFAO",
			title: "Party Rock Anthem"
		});
		expect(splitTitle("Wake Me Up", "AviciiVEVO")).toEqual({
			artist: "Avicii",
			title: "Wake Me Up"
		});
	});
});

describe("youtube: page data", () => {
	const lockup = (
		id: string,
		title: string,
		channel: string,
		length: string
	) => ({
		lockupViewModel: {
			contentId: id,
			contentType: "LOCKUP_CONTENT_TYPE_VIDEO",
			contentImage: {
				thumbnailViewModel: {
					overlays: [
						{
							thumbnailBottomOverlayViewModel: {
								badges: [
									{
										thumbnailBadgeViewModel: {
											text: length
										}
									}
								]
							}
						}
					]
				}
			},
			metadata: {
				lockupMetadataViewModel: {
					title: { content: title },
					metadata: {
						contentMetadataViewModel: {
							metadataRows: [
								{
									metadataParts: [
										{ text: { content: channel } }
									]
								}
							]
						}
					}
				}
			}
		}
	});

	test("new layout (lockups), older layout and a mix's panel; each video once", () => {
		const data = {
			contents: [
				lockup("aaaaaaaaaaa", "Avicii - Hey Brother", "Avicii", "4:24"),
				lockup("aaaaaaaaaaa", "Avicii - Hey Brother", "Avicii", "4:24"),
				{
					lockupViewModel: {
						contentId: "PLnotavideo",
						contentType: "LOCKUP_CONTENT_TYPE_PLAYLIST"
					}
				},
				{
					playlistVideoRenderer: {
						videoId: "bbbbbbbbbbb",
						title: { runs: [{ text: "No Surprises" }] },
						shortBylineText: { runs: [{ text: "Radiohead" }] },
						lengthSeconds: "228"
					}
				},
				{
					playlistVideoRenderer: {
						videoId: "ccccccccccc",
						title: { runs: [{ text: "Gone" }] },
						isPlayable: false
					}
				},
				{
					playlistPanelVideoRenderer: {
						videoId: "ddddddddddd",
						title: {
							simpleText: "Stromae - papaoutai (Official Video)"
						},
						shortBylineText: { runs: [{ text: "Stromae" }] },
						lengthText: { simpleText: "3:53" }
					}
				}
			]
		};
		expect(
			playlistTracks(data).map((t) => [
				t.artist.name,
				t.title,
				t.duration,
				t.url
			])
		).toEqual([
			[
				"Avicii",
				"Hey Brother",
				264,
				"https://www.youtube.com/watch?v=aaaaaaaaaaa"
			],
			[
				"Radiohead",
				"No Surprises",
				228,
				"https://www.youtube.com/watch?v=bbbbbbbbbbb"
			],
			[
				"Stromae",
				"papaoutai",
				233,
				"https://www.youtube.com/watch?v=ddddddddddd"
			]
		]);
	});
});

// A user's playlist: its videos can change, so only the shape is checked.
test("youtube: resolve a playlist link (network)", async () => {
	const playlist = await youtubePlaylist(
		"https://www.youtube.com/watch?v=TsvL2poCHug&list=PLKKM-o5LHrqpi3I2grem6JAF7dj367wYE"
	);
	expect(playlist?.title).toBe("Chill");
	expect(playlist!.tracks.length).toBeGreaterThan(10);
	expect(
		new Set(playlist!.tracks.map((t) => t.artist.name)).size
	).toBeGreaterThan(5);
});
