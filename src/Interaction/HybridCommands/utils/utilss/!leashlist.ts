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
import { DatabaseStructure } from "../../../../../types/database_structure.js";

import { SubCommand } from "../../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	pageLabel,
	sendPaginatedCard
} from "../../../../core/modules/uiCard.js";

const PER_PAGE = 10;

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

		const baseData =
			(await client.db.get(
				`${interaction.guildId}.UTILS.LEASH_CONFIG`
			)) ||
			({
				maxLeashedByUsers: 3,
				maxLeashTime: client.timeCalculator.to_ms("30min")
			} as DatabaseStructure.LeashConfig);
		const fetchedData = ((await client.db.get(
			`${interaction.guildId}.UTILS.LEASH`
		)) || []) as DatabaseStructure.LeashData[];
		const now = Date.now();
		const maxLeashTime =
			baseData.maxLeashTime ?? client.timeCalculator.to_ms("30min");
		const activeLeashes = fetchedData.filter(
			(leash) => now - leash.timestamp <= maxLeashTime
		);

		if (activeLeashes.length !== fetchedData.length) {
			await client.db.set(
				`${interaction.guildId}.UTILS.LEASH`,
				activeLeashes
			);
		}

		if (activeLeashes.length === 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_leashlist_no_data.replace(
					"${emoji_No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		const e = client.iHorizon_Emojis;
		const pages = Math.ceil(activeLeashes.length / PER_PAGE);
		const signature = await botSignature(client, interaction.guildId);

		await sendPaginatedCard({
			client,
			interaction,
			lang,
			pages,
			timeoutMs: 60_000 * 15,
			render: (page) =>
				buildCard({
					accent: ACCENT.info,
					emoji: e.Link_Icon,
					title: lang.util_leashlist_embed_title,
					description: `-# ${lang.util_leashlist_card_count.replace("${count}", String(activeLeashes.length))}`,
					blocks: [
						activeLeashes
							.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
							.map((leash) => {
								const expires = Math.floor(
									(leash.timestamp + maxLeashTime) / 1000
								);
								return `<@${leash.dom}> → <@${leash.sub}>\n-# ${lang.util_leashlist_card_expires} <t:${expires}:R>`;
							})
							.join("\n")
					],
					footer: pageLabel(lang, page, pages),
					signature
				})
		});
	}
};
