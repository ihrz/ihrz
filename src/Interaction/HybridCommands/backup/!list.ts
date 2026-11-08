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
	MAX_BACKUPS_PER_USER,
	normalizeComponents
} from "../../../core/backup/src/components.js";
import { componentEmoji } from "../../../core/modules/backupPanels.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	pageLabel,
	sendPaginatedCard
} from "../../../core/modules/uiCard.js";

const ITEMS_PER_PAGE = 5;

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData
	) => {
		// Guard's Typing
		if (
			!interaction.member ||
			!client.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const index = await client.backup.getUserBackups(
			interaction.member.user.id
		);
		const ids = Object.keys(index).sort((a, b) =>
			BigInt(a) < BigInt(b) ? 1 : -1
		);
		const pages = Math.max(1, Math.ceil(ids.length / ITEMS_PER_PAGE));
		const signature = await botSignature(client, interaction.guildId);
		const usage = lang.backup_usage
			.replace("${count}", String(ids.length))
			.replace("${max}", String(MAX_BACKUPS_PER_USER));

		await sendPaginatedCard({
			client,
			interaction,
			lang,
			pages,
			render: (page) =>
				buildCard({
					accent: ACCENT.neutral,
					emoji: client.iHorizon_Emojis.Backup_Main,
					title: lang.backup_list_title,
					description: ids.length ? usage : lang.backup_list_empty,
					blocks: ids
						.slice(
							page * ITEMS_PER_PAGE,
							(page + 1) * ITEMS_PER_PAGE
						)
						.map((id) => {
							const entry = index[id];
							const date = entry.createdTimestamp
								? `<t:${Math.floor(entry.createdTimestamp / 1000)}:R>`
								: "-";
							const icons = normalizeComponents(
								entry.components ?? []
							)
								.map((c) => componentEmoji(client, c))
								.join(" ");
							return lang.backup_list_entry
								.replace("${guildName}", entry.guildName)
								.replace("${id}", id)
								.replace("${date}", date)
								.replace(
									"${mode}",
									entry.auto
										? lang.backup_list_auto
										: lang.backup_list_manual
								)
								.replace(
									"${categoryCount}",
									String(entry.categoryCount)
								)
								.replace(
									"${channelCount}",
									String(entry.channelCount)
								)
								.concat(icons ? `\n${icons}` : "");
						}),
					footer: pageLabel(lang, page, pages),
					signature
				})
		});
	}
};
