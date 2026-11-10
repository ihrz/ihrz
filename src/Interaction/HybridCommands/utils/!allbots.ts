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

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	notice,
	pageLabel,
	sendCard,
	sendPaginatedCard
} from "../../../core/modules/uiCard.js";
import { guildBots } from "../../../core/modules/serverAudit.js";

const PER_PAGE = 10;

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData
	) => {
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const guild = interaction.guild;
		const e = client.iHorizon_Emojis;
		const bots = guildBots(guild);

		if (bots.length === 0) {
			await sendCard(
				client,
				interaction,
				notice("info", `${e.No} ${lang.all_bots_none}`)
			);
			return;
		}

		const pages = Math.ceil(bots.length / PER_PAGE);
		const signature = await botSignature(client, guild.id);

		await sendPaginatedCard({
			client,
			interaction,
			lang,
			pages,
			render: (page) =>
				buildCard({
					accent: ACCENT.neutral,
					emoji: e.Slash_Bot_Badge,
					title: lang.all_bots_card_title.replace(
						"${guild}",
						guild.name
					),
					description: `-# ${lang.all_bots_card_count.replace("${count}", String(bots.length))}`,
					thumbnail: guild.iconURL({ size: 128 }),
					blocks: [
						bots
							.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
							.map((m) => {
								const verified = m.user.flags?.has(
									"VerifiedBot"
								)
									? ` ${e.Verified_App_1}`
									: "";
								const joined = m.joinedTimestamp
									? ` · <t:${Math.floor(m.joinedTimestamp / 1000)}:R>`
									: "";
								return `${m}${verified}\n-# \`${m.user.tag}\`${joined}`;
							})
							.join("\n")
					],
					footer: pageLabel(lang, page, pages),
					signature
				})
		});
	}
};
