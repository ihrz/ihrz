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
	Period,
	sendStatsCard,
	statsContext,
	topView
} from "../../../core/modules/statsCommand.js";
import { notice, sendCard } from "../../../core/modules/uiCard.js";

// /stats top-messages [period] [limit]: the members with the most messages.
const PERIODS: Record<string, Period> = {
	daily: "1d",
	weekly: "7d",
	monthly: "30d"
};

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		let periodKey: string | null;
		let limit: number | null;
		if (interaction instanceof ChatInputCommandInteraction) {
			periodKey = interaction.options.getString("period");
			limit = interaction.options.getInteger("limit");
		} else {
			periodKey = args?.[0]?.toLowerCase() ?? null;
			limit = args?.[1] ? parseInt(args[1], 10) : null;
		}
		const period = PERIODS[periodKey ?? ""] ?? "30d";
		const count = Math.min(
			15,
			Math.max(3, Number.isFinite(limit) && limit ? limit : 10)
		);

		const ctx = await statsContext(client, interaction, lang);
		const views = await topView(ctx, "messages", period, count);
		if (!views) {
			await sendCard(
				client,
				interaction,
				notice(
					"info",
					`${client.iHorizon_Emojis.Stats} ${lang.stats_card_no_data}`
				)
			);
			return;
		}
		await sendStatsCard(ctx, {
			title: lang.stats_title_top_messages,
			emoji: client.iHorizon_Emojis.Crown,
			accent: 0x6c8bff,
			views
		});
	}
};
