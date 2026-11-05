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
	pageLabel,
	sendPaginatedCard
} from "../../../core/modules/uiCard.js";

const PER_PAGE = 10;
const REASON_MAX = 80;

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		const fetchedBan = await interaction.guild?.bans.fetch();
		const bansArray = fetchedBan?.map((ban) => ban);

		if (!bansArray || bansArray?.length == 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.var_no_one_banned
			});
			return;
		}

		const e = client.iHorizon_Emojis;
		const pages = Math.ceil(bansArray.length / PER_PAGE);
		const signature = await botSignature(client, interaction.guildId);

		await sendPaginatedCard({
			client,
			interaction,
			lang,
			pages,
			timeoutMs: 60_000 * 15,
			render: (page) =>
				buildCard({
					accent: ACCENT.danger,
					emoji: e.Ban_Hammer,
					title: lang.banlist_card_title,
					description: `-# ${lang.banlist_card_count.replace("${count}", String(bansArray.length))}`,
					thumbnail: interaction.guild?.iconURL({ size: 128 }),
					blocks: [
						bansArray
							.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
							.map((ban) => {
								const reason = ban.reason
									? ` · ${ban.reason.length > REASON_MAX ? `${ban.reason.slice(0, REASON_MAX - 1)}…` : ban.reason}`
									: "";
								return `${ban.user} \`${ban.user.tag}\`\n-# \`${ban.user.id}\`${reason}`;
							})
							.join("\n")
					],
					footer: pageLabel(lang, page, pages),
					signature
				})
		});
		return;
	}
};
