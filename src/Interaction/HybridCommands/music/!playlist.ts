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

import { ChatInputCommandInteraction, Client, Message } from "discord.js";
import { authorOf, isMessage } from "../../../core/functions/method/source.js";

import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import { openLibraryPanel } from "../../../core/modules/musicLibraryPanel.js";

// Your playlists and liked tracks (the dashboard's music library).
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
		const userId = authorOf(interaction).id;

		let sent: Message | null = null;
		await openLibraryPanel({
			client,
			lang,
			guild: interaction.guild,
			userId,
			open: opts.longString("name", 0),
			send: async (payload) =>
				(sent = await client.func.method.interactionSend(
					interaction,
					payload
				)),
			// The slash reply is ephemeral: only the interaction can edit it.
			edit: (payload) =>
				isMessage(interaction)
					? sent!.edit(payload)
					: interaction.editReply(payload)
		});
	}
};
