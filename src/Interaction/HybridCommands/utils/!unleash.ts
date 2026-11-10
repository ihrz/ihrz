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

import { releaseLeash } from "../../../core/modules/memberToolsManager.js";

import { SubCommand } from "../../../../types/command.js";

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
		const user = opts.member("member", 0)!;

		const released = await releaseLeash(
			client,
			interaction.guild.id,
			interaction.member.user.id,
			user.id
		);

		if (!released) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_unleash_not_in_leash.replace(
					"${emoji_No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		await client.func.method.interactionSend(interaction, {
			content: lang.util_unleash_command_ok.replace(
				"${emoji_Yes}",
				client.iHorizon_Emojis.Yes
			)
		});
	}
};
