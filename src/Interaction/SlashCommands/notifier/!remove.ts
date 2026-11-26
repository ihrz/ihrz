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

import { ChatInputCommandInteraction, Client } from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";
import { Platform } from "../../../core/StreamNotifier.js";

import { SubCommand } from "../../../../types/command.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached">,
		lang: LanguageData
	) => {
		// Guard's Typing
		if (
			!interaction.member ||
			!client.user ||
			!interaction.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const platform = interaction.options.getString("platform") as Platform;
		const author = interaction.options.getString("author") as string;

		const fetched = (await client.db.get(
			`${interaction.guildId}.NOTIFIER`
		)) as DatabaseStructure.NotifierSchema | null;
		const fetchedUsers = fetched?.users || [];
		// The stored value, or the canonical value of what was typed (a Bluesky @handle finds its DID).
		const index = await client.notifier.findFollowed(
			fetchedUsers,
			platform,
			author
		);
		if (index !== -1) {
			const filteredArray = fetchedUsers.filter((_, i) => i !== index);
			await client.db.set(
				`${interaction.guildId}.NOTIFIER.users`,
				filteredArray
			);

			await client.func.method.interactionSend(interaction, {
				embeds: [
					await client.notifier.generateAuthorsEmbed(
						interaction.guild
					),
					await client.notifier.generateConfigurationEmbed(
						interaction.guild
					)
				]
			});
		} else {
			return client.func.method.interactionSend(interaction, {
				content: lang.notifier_author_add_author_doesnt_exist
			});
		}
	}
};
