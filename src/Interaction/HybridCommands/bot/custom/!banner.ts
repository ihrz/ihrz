/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

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
} from 'discord.js';

import { LanguageData } from '../../../../../types/languageData.js';
import { SubCommand } from '../../../../../types/command.js';
import { axios } from '../../../../core/functions/axios.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {
		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

		const action = interaction.options.getString("action");
		const banner = interaction.options.getAttachment("banner")!;

		if (action === "reset") {
			await interaction.editReply({ content: lang.custom_banner_reset });

			return;
		} else if (banner && client.func.validImageType(banner.contentType)) {
			const fileBuffer = (await axios.get(banner.url!, { responseType: "arrayBuffer" })).data;
			const buffer = Buffer.from(fileBuffer);
			const base64String = buffer.toString('base64');
			await client.func.customProfileHelper.changeGuildBotBanner(interaction.guild, `data:image/jpeg;base64,${base64String}`);

			const x = interaction.guild.members.me?.bannerURL({ size: 4096 });

			await interaction.editReply({
				content: lang.custom_banner_set
					.replace("${client.iHorizon_Emojis.Yes}", client.iHorizon_Emojis.Yes)
					.replace("${client.iHorizon_Emojis.Crown}", client.iHorizon_Emojis.Crown)
					.replace("${x}", String(x))
			});
			return;
		} else {
			await interaction.editReply({ content: lang.guildconfig_setbot_footeravatar_incorect });
			return;
		}
	},
};