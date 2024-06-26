/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

/*
    This code are a remixed code from https://github.com/Androz2091/discord-player
    Thank you!
*/
import { Client as GeniusClient } from 'genius-lyrics';

interface LyricsData {
    title: string;
    fullTitle: string;
    id: number;
    thumbnail: string;
    image: string;
    url: string;
    artist: {
        name: string;
        id: number;
        url: string;
        image: string;
    };
    lyrics: string;
}

export class LyricsManager {
    private client: GeniusClient;

    constructor(apiKey?: string, force?: boolean) {
        if (!this.client && !force) {
            this.client = new GeniusClient(apiKey);
        }
    }

    public async search(query: string): Promise<LyricsData | null> {
        return new Promise<LyricsData | null>((resolve, reject) => {
            if (typeof query !== 'string') {
                return reject(new TypeError(`Expected search query to be a string, received "${typeof query}"!`));
            }

            this.client.songs
                .search(query)
                .then(async (songs) => {
                    const data = {
                        title: songs[0].title,
                        fullTitle: songs[0].fullTitle,
                        id: songs[0].id,
                        thumbnail: songs[0].thumbnail,
                        image: songs[0].image,
                        url: songs[0].url,
                        artist: {
                            name: songs[0].artist.name,
                            id: songs[0].artist.id,
                            url: songs[0].artist.url,
                            image: songs[0].artist.image
                        },
                        lyrics: await songs[0].lyrics(false)
                    };

                    resolve(data);
                })
                .catch(() => {
                    reject(new Error('Could not parse lyrics'));
                });
        });
    }
};