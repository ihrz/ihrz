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

import * as url from "url";

const allowedDomains: string[] = [
	"open.spotify.com",
	"play.spotify.com",
	"spotify.com",
	"www.spotify.com",

	"www.deezer.com",
	"deezer.com",
	"deezer.page.link",
	"dzr.page.link",
	"link.deezer.com",

	"soundcloud.com",
	"www.soundcloud.com",
	"on.soundcloud.com",
	"m.soundcloud.com",

	"music.apple.com",
	"www.music.apple.com",

	"www.napster.com",
	"napster.com",
	"us.napster.com",

	// Amazon Music
	"music.amazon.com",
	"amazon.com",
	"www.amazon.com",
	"music.amazon.co.uk",
	"music.amazon.de",
	"music.amazon.fr",
	"music.amazon.it",
	"music.amazon.es",
	"music.amazon.ca",
	"music.amazon.co.jp",
	"music.amazon.com.au",
	"music.amazon.com.br",
	"music.amazon.in",
	"music.amazon.com.mx",

	"cdn.discordapp.com",

	"youtu.be",
	"youtube.com",
	"www.youtube.com",
	"music.youtube.com"
];

export default function isAllowedLinks(link: string): boolean {
	if (link !== null) {
		const parsedUrl = url.parse(link);

		if (parsedUrl.hostname !== null) {
			return allowedDomains.includes(parsedUrl.hostname);
		}
	}
	return true;
}
