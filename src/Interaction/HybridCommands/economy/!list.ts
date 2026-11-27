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

import { Client, ChatInputCommandInteraction, Message } from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import { sendCard } from "../../../core/modules/uiCard.js";
import { roleListCard } from "../../../core/modules/economyCards.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData
	) => {
		// Guard's Typing
		if (
			!interaction.member ||
			!client.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const roleData = await client.func.economyHelper.pruneBuyableRoles(
			interaction.guild
		);

		if (Object.keys(roleData).length === 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.economy_role_list_no_buyable_roles
			});
			return;
		}

		await sendCard(
			client,
			interaction,
			await roleListCard(client, interaction.guildId!, roleData, lang, {
				title: lang.economy_role_list_embed_title,
				description: lang.economy_role_list_embed_desc
			})
		);
	}
};
