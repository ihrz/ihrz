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

import { User } from "discord.js";
import { LyricsResult, SearchResult, Track } from "lavalink-client";

export default async function getLyrics(query: string, author?: User): Promise<{
	track: Track | undefined;
	res: LyricsResult;
} | null> {

	let res: SearchResult | undefined;
	let node;

	for (const _node of client.player.nodeManager.nodes.values()) {
		if (_node.connected === false) continue;

		res = await _node?.search({ query }, author || client.user)

		if (res?.tracks.length! > 0) {
			node = _node;
			break;
		}
	}

	if (res?.tracks.length === 0) {
		return null;
	}

	const response = await node?.lyrics.get(res?.tracks[0]!);

	if (!response) {
		return null;
	}

	return {
		track: res?.tracks[0],
		res: response
	}
}