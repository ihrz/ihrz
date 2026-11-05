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
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	GuildMember,
	Message,
	User
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";
import {
	guildViews,
	sendStatsCard,
	statsContext
} from "../../../core/modules/statsCommand.js";
import { notice, sendCard } from "../../../core/modules/uiCard.js";

// /stats gstats: the whole server's last 30 days (overview, rhythm, channels).
export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData
	) => {
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const ctx = await statsContext(client, interaction, lang);
		const views = await guildViews(ctx);
		if (!views) {
			await sendCard(
				client,
				interaction,
				notice(
					"info",
					`${client.iHorizon_Emojis.Server_Stats} ${lang.stats_card_no_data}`
				)
			);
			return;
		}
		await sendStatsCard(ctx, {
			title: lang.stats_title_guild.replace(
				"${guild}",
				interaction.guild.name
			),
			emoji: client.iHorizon_Emojis.Server_Stats,
			views
		});
	}
};
