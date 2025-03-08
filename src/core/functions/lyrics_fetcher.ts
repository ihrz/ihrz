/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { axios } from "./axios.js";
import { sanitizing } from "./sanitizer.js";

/*
	This code are a remixed code from https://github.com/Androz2091/discord-player
	Thank you!
*/

interface LyricsData {
	title: string;
	image: string;
	url: string;
	artist: {
		name: string;
	};
	lyrics: string;
}

export class LyricsManager {
	// private client: GeniusClient;

	// constructor(apiKey: string = process.env.GENIUS_API_KEY || "none", force?: boolean) {
	//     if (!this.client && !force) {
	//         this.client = new GeniusClient("ctqcTcvIvWeOjXqYLKU10PBwWVS5xb2bfD0OKnpnxN8VdQyFYvG4gZUavWQHlR8j");
	//     }
	// }

	public async search(query: string): Promise<LyricsData | null> {
		return new Promise<LyricsData | null>((resolve, reject) => {
			if (typeof query !== 'string') {
				return reject(new TypeError(`Expected search query to be a string, received "${typeof query}"!`));
			}

			axios.get("https://weeb-api.vercel.app/genius?query=" + encodeURI(sanitizing(query)))
				.then(async (res) => {
					const songs = res.data;

					if (songs.length === 0) throw "Not found!"

					const data: LyricsData = {
						title: songs[0].title,
						image: songs[0].image,
						url: songs[0].url,
						artist: {
							name: songs[0].artist,
						},
						lyrics: await this.lyrics(songs[0]["url"]) || "not found"
					};

					resolve(data);
				})
				.catch(() => {
					reject(new Error('Could not parse lyrics'));
				});
		});
	}

	private async lyrics(url: string): Promise<string | undefined> {
		return (await axios.get("https://weeb-api.vercel.app/lyrics?url=" + encodeURI(sanitizing(url)))).data
	}
};