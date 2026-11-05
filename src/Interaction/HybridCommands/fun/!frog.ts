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

import { LanguageData } from "../../../../types/languageData.js";
import { axios } from "../../../core/functions/axios.js";

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	sendCard
} from "../../../core/modules/uiCard.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (
			(await client.db.get(`${interaction.guildId}.GUILD.FUN.states`)) ===
			"off"
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.fun_category_disable
			});
			return;
		}
		axios.get("https://api.animality.xyz/all/frog").then(async (res) => {
			// Same look for every animal picture.
			await sendCard(
				client,
				interaction,
				buildCard({
					accent: ACCENT.info,
					emoji: client.iHorizon_Emojis.Camera,
					title: lang.fun_card_frog_title,
					description: `-# ${lang.fun_card_animal_hint}`,
					images: [res.data.image],
					signature: await botSignature(client, interaction.guildId)
				})
			);
			return;
		});
	}
};
