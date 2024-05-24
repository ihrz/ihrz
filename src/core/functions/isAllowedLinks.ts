/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import * as url from 'url';

let allowedDomains: string[] = [
    'open.spotify.com', 'play.spotify.com', 'spotify.com',
    'www.spotify.com', 'www.deezer.com', 'deezer.com',
    'www.youtube.com', 'youtube.com', 'youtu.be',
    'soundcloud.com', 'www.soundcloud.com',
    'music.apple.com', 'www.music.apple.com',
    'music.youtube.com', 'www.music.youtube.com',
    'www.napster.com', 'napster.com', 'us.napster.com',
    'play.google.com', 'music.youtube.com',
    'music.apple.com', 'www.music.apple.com',
    'www.deezer.com', 'deezer.com', 'deezer.page.link',
    'cdn.discordapp.com'
];

function isAllowedLinks(link: string): boolean {
    if (link !== null) {
        let parsedUrl = url.parse(link);

        if (parsedUrl.hostname !== null) {
            return allowedDomains.includes(parsedUrl.hostname);
        }
    };
    return true;
};

export default isAllowedLinks;