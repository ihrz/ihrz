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
	Message,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.member.user || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var action = interaction.options.getString("action", true);
			var prefix = interaction.options.getString('name');
		} else {
			var action = "change"
			var prefix = client.func.method.string(args!, 0);
		}


		if (action === "mention") {
			await client.db.delete(`${interaction.guildId}.BOT.prefix`);
			await client.func.method.interactionSend(interaction, { content: lang.guildconfig_setbot_prefix_prefix_now_mention })
		} else if (action === "change") {
			if (!prefix) return await client.func.method.interactionSend(interaction, { content: lang.guildconfig_setbot_prefix_prefix_specify_prefix });
			if (prefix.length >= 5) return await client.func.method.interactionSend(interaction, { content: lang.guildconfig_setbot_prefix_prefix_too_long });

			const formatedPrefix = prefix.split(" ")[0];
			await client.db.set(`${interaction.guildId}.BOT.prefix`, formatedPrefix);

			await client.func.method.interactionSend(interaction, {
				content: lang.guildconfig_setbot_prefix_prefix_is_good
					.replace("${formatedPrefix}", formatedPrefix)
			});
			return;
		}
	},
};