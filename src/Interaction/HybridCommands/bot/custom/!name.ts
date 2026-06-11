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

import { LanguageData } from "../../../../../types/languageData.js";

import { SubCommand } from "../../../../../types/command.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!interaction.member ||
			!client.user ||
			!interaction.member.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var action = interaction.options.getString("action");
			var name = interaction.options.getString("name");
		} else {
			var action = client.func.method.string(args!, 0);
			var name = client.func.method.longString(args!, 1);
		}

		if (action === "reset") {
			await client.db.delete(`${interaction.guildId}.BOT.botName`);

			await client.func.method.interactionSend(interaction, {
				content: lang.custom_name_reset
			});
			await client.func.customProfileHelper.changeGuildBotName(
				interaction.guild,
				client.user.displayName
			);
			return;
		} else if (name) {
			if (name.length >= 32)
				return await client.func.method.interactionSend(interaction, {
					content:
						lang.guildconfig_setbot_footername_footer_too_long_msg
				});

			await client.db.set(`${interaction.guildId}.BOT.botName`, name);
			await client.func.customProfileHelper.changeGuildBotName(
				interaction.guild,
				name
			);

			await client.func.method.interactionSend(interaction, {
				content: lang.custom_name_set
					.replace(
						"${client.iHorizon_Emojis.Yes}",
						client.iHorizon_Emojis.Yes
					)
					.replace(
						"${client.iHorizon_Emojis.Crown}",
						client.iHorizon_Emojis.Crown
					)
					.replace("${name}", name)
			});
			return;
		} else {
			await client.func.method.interactionSend(interaction, {
				content: lang.guildconfig_setbot_footername_not_found
			});
			return;
		}
	}
};
