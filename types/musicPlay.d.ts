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

import {
	CacheType,
	ChatInputCommandInteraction,
	Client,
	Message,
	MessageContextMenuCommandInteraction,
	MessageReplyOptions,
} from 'discord.js';

import {
	LavalinkNode,
	Player,
	SearchResult,
	Track,
} from 'lavalink-client';

import { LanguageData } from './languageData.js';

export type PlayInteraction =
	| ChatInputCommandInteraction<"cached">
	| Message
	| MessageContextMenuCommandInteraction<CacheType>;

export type PlayResponsePayload = Pick<MessageReplyOptions, "allowedMentions" | "content" | "embeds">;

export interface HandleMusicPlayOptions {
	client: Client;
	deleteAfterMs?: number;
	interaction: PlayInteraction;
	lang: LanguageData;
	queries: string[];
	respond: (payload: PlayResponsePayload) => Promise<Message>;
}

export interface SearchMusicQueryResult {
	node?: LavalinkNode;
	res?: SearchResult;
}