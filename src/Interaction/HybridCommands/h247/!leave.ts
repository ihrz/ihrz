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

import logger from "../../../core/logger.js";
import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";
import {
	getH247Data,
	deleteH247Data,
	leaveCurrentVoiceConnection
} from "../../../core/modules/h247Manager.js";

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

		const existing = await getH247Data(client, interaction.guild.id);

		if (!existing?.enabled) {
			await client.func.method.interactionSend(interaction, {
				content: lang.h247_leave_not_active.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		try {
			await deleteH247Data(client, interaction.guild.id);

			if (!client.player.getPlayer(interaction.guild.id)) {
				await leaveCurrentVoiceConnection(interaction.guild);
			}

			await client.func.method.interactionSend(interaction, {
				content: lang.h247_left.replace(
					"${client.iHorizon_Emojis.Yes}",
					client.iHorizon_Emojis.Yes
				)
			});
		} catch (error) {
			logger.err(
				`H247 leave error in guild ${interaction.guild.id}: ${error}`
			);
			await client.func.method.interactionSend(interaction, {
				content: lang.h247_leave_error.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
		}
	}
};
