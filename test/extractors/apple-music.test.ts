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

import appleMusic from "../../src/core/extractors/apple-music/index.js";

const testingTargets = {
	song: {
		type: "song",
		url: "https://music.apple.com/nz/album/butterfly/1541902791?i=1541903021"
	},
	album: {
		type: "album",
		url: "https://music.apple.com/us/album/meditations-for-living-an-awakened-life/1602431360"
	},
	playlist: {
		type: "playlist",
		url: "https://music.apple.com/us/playlist/jumpstart/pl.4b0436590393442e9493307577d16742"
	}
};

Object.values(testingTargets).forEach((target) => {
	test(`apple music: resolve ${target.type}`, async () => {
		await expect(appleMusic(target.url)).resolves.toMatchSnapshot();
	});
});
