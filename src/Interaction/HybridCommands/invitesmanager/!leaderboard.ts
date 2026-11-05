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
import { DatabaseStructure } from "../../../../types/database_structure.js";

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

const PER_PAGE = 10;

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		const execTimestamp = Date.now();

		// Guard's Typing
		if (
			!interaction.member ||
			!client.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const char = (await client.db.get(
			`${interaction.guildId}.USER`
		)) as DatabaseStructure.DbGuildUserObject;
		const arr: {
			invites: number;
			regular: number;
			bonus: number;
			leaves: number;
			inviter: string;
		}[] = [];

		for (const key in char) {
			const a = char?.[key]?.INVITES;

			if (a && a.invites && a.invites >= 1) {
				arr.push({
					invites: a.invites || 0,
					regular: a.regular || 0,
					bonus: a.bonus || 0,
					leaves: a.leaves || 0,
					inviter: key
				});
			}
		}
		arr.sort((a, b) => b.invites - a.invites);

		const e = client.iHorizon_Emojis;
		const guild = interaction.guild;

		if (arr.length === 0) {
			await sendCard(
				client,
				interaction,
				notice("info", `${e.No} ${lang.leaderboard_card_empty}`)
			);
			return;
		}

		const userId = interaction.member.user.id;
		const userRank = arr.findIndex((user) => user.inviter === userId);
		const userRankText =
			userRank !== -1
				? lang.leaderboard_card_your_rank
						.replace("${rank}", String(userRank + 1))
						.replace("${count}", arr.length.toString())
						.replace("${invites}", String(arr[userRank].invites))
				: lang.leaderboard_card_not_ranked;
		const generated = lang.leaderboard_card_generated.replace(
			"${elapsed}",
			String(Date.now() - execTimestamp)
		);

		const pages = Math.ceil(arr.length / PER_PAGE);
		const signature = await botSignature(client, guild.id);

		await sendPaginatedCard({
			client,
			interaction,
			lang,
			pages,
			// As before: the pages stay usable for 15 minutes.
			timeoutMs: 15 * 60_000,
			render: (page) =>
				buildCard({
					accent: ACCENT.neutral,
					emoji: e.Crown,
					title: lang.leaderboard_card_title,
					description: `-# ${lang.leaderboard_card_count
						.replace("${count}", String(arr.length))
						.replace("${guild}", guild.name)}`,
					thumbnail:
						guild.iconURL({ size: 256 }) ||
						client.user?.displayAvatarURL({ size: 256 }),
					blocks: [
						arr
							.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
							.map((entry, index) => {
								const rank = page * PER_PAGE + index + 1;
								const badge = rank === 1 ? `${e.Crown} ` : "";
								return (
									`${badge}\`#${rank}\` <@${entry.inviter}> · ${lang.invites_label_total} **${entry.invites}**\n` +
									`-# ${lang.invites_label_regular} \`${entry.regular}\` · ${lang.invites_label_bonus} \`${entry.bonus}\` · ${lang.invites_label_left} \`${entry.leaves}\``
								);
							})
							.join("\n"),
						`${e.Stats} ${userRankText}`
					],
					footer: `${pageLabel(lang, page, pages)} · ${generated}`,
					signature
				})
		});
	}
};
