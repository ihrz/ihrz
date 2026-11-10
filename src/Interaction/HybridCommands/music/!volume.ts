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
	ChatInputCommandInteraction,
	Client,
	GuildMember,
	Message
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import logger from "../../../core/logger.js";
import { SubCommand } from "../../../../types/command.js";
import { setMusicVolume } from "../../../core/modules/musicControls.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const opts = client.func.method.options(interaction, args);
		const query = opts.string("level", 0);
		const sanitizedVolume = parseInt(String(query));

		try {
			const result = await setMusicVolume(
				client,
				interaction.member as GuildMember,
				sanitizedVolume
			);
			if (!result.ok) {
				const content = {
					not_in_voice: lang.pause_nothing_playing,
					nothing_playing: lang.pause_nothing_playing,
					not_same_channel: lang.pause_nothing_playing,
					not_enough_tracks: null
				}[result.reason];
				if (content) {
					await client.func.method.interactionSend(interaction, {
						content
					});
				}
				return;
			}

			await client.func.method.interactionSend(interaction, {
				content: lang.music_volume_command_ok
					.replace("${emoji_Yes}", client.iHorizon_Emojis.Yes)
					.replace("${query}", String(query))
			});
		} catch (error) {
			logger.err(error);
		}
	}
};
