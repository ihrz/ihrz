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

import tidalMusic from "../../src/core/extractors/tidal/index.js";

const testingTargets = {
	song: {
		type: "song",
		url: "https://tidal.com/track/510366521/u"
	},
	album: {
		type: "album",
		url: "https://tidal.com/album/539234099/u"
	},
	playlist: {
		type: "playlist",
		url: "https://tidal.com/playlist/edf3b7d2-cb42-41d7-93c0-afa2a395521b"
	}
};

Object.values(testingTargets).forEach((target) => {
	test(`tidal: resolve ${target.type}`, async () => {
		await expect(tidalMusic(target.url)).resolves.toMatchSnapshot();
	});
});
