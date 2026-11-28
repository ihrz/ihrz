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
import { SubCommand } from "../../../../types/command.js";
import {
	LASTFM_PERIODS,
	LastFMPeriod,
	lastfmOverviewCard
} from "../../../core/modules/lastfmCards.js";
import { cardPayload, notice } from "../../../core/modules/uiCard.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached">,
		lang: LanguageData
	) => {
		const target = interaction.options.getUser("user") ?? interaction.user;
		const raw = interaction.options.getString("period");
		const period: LastFMPeriod = LASTFM_PERIODS.includes(
			raw as LastFMPeriod
		)
			? (raw as LastFMPeriod)
			: "7day";
		const reply = (content: string) =>
			client.func.method.interactionSend(
				interaction,
				cardPayload(notice("warning", content)) as never
			);

		if (!client.lastFMScrobbler.isConfigured()) {
			return reply(
				client.lastFMScrobbler.getMissingConfigurationMessage(lang)
			);
		}
		const settings = await client.lastFMScrobbler.getUserSettings(
			target.id
		);
		if (!settings?.username) {
			return reply(
				lang.lastfm_overview_not_linked.replace(
					"${user}",
					target.toString()
				)
			);
		}
		const card = await lastfmOverviewCard(
			settings.username,
			target.toString(),
			period,
			lang
		);
		if (!card) return reply(lang.lastfm_overview_unavailable);
		await client.func.method.interactionSend(
			interaction,
			cardPayload(card) as never
		);
	}
};
