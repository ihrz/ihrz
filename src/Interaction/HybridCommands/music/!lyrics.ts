/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Guild,
	Message,
	User,
} from 'discord.js';

import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';


import { SubCommand } from '../../../../types/command.js';
import { SearchResult } from 'lavalink-client';

export async function getLyrics(query: string, author?: User) {

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

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var title = interaction.options.getString("query")!;
		} else {

			var title = (args?.join(" ") || " ") as string
		}

		try {
			const response = await getLyrics(title);

			if (!response?.res.text) {
				await client.func.method.interactionSend(interaction, { content: lang.lyrics_not_found });
				return;
			}

			const trimmedLyrics = response?.res.text?.substring(0, 1997);

			const embed = new EmbedBuilder()
				.setTitle(response.track!.info.title || lang.lyrics_embed_title_unknown)
				.setURL(response.track!.info.uri || "https://spotify.com")
				.setTimestamp()
				.setThumbnail(response.track!.info.artworkUrl || null)
				.setAuthor({
					name: response.track!.info.author || lang.lyrics_embed_author_name_unknown,
				})
				.setDescription(trimmedLyrics?.length === 1997 ? `${trimmedLyrics}...` : trimmedLyrics ?? 'null')
				.setColor('#cd703a')
				.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!));

			await client.func.method.interactionSend(interaction, {
				embeds: [embed],
				files: [await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction)]
			});
			return;

		} catch (error: any) {
			logger.err(error)
			await client.func.method.interactionSend(interaction, { content: lang.lyrics_not_found });
			return;
		};
	},
};