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

		const opts = client.func.method.options(interaction, args);
		const role = opts.role("role", 0)!;

		if (!role) {
			return await client.func.method.interactionSend(interaction, {
				content: lang.addrolereact_role_not_found
			});
		}

		const roles_members = Array.from(role.members.values());

		if (roles_members.length == 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_role_members_no_one
			});
			return;
		}

		const e = client.iHorizon_Emojis;
		const pages = Math.ceil(roles_members.length / PER_PAGE);
		const signature = await botSignature(client, interaction.guildId);

		await sendPaginatedCard({
			client,
			interaction,
			lang,
			pages,
			timeoutMs: 1_60_000,
			render: (page) =>
				buildCard({
					accent: role.color || ACCENT.info,
					emoji: e.Ticket_Role,
					title: lang.role_members_card_title.replace(
						"${role}",
						role.name
					),
					description: `${role}\n-# ${lang.role_members_card_count.replace("${count}", String(roles_members.length))}`,
					blocks: [
						roles_members
							.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
							.map((m) => {
								const bot = m.user.bot
									? ` ${e.Slash_Bot_Badge} ${lang.card_bot}`
									: "";
								const joined = m.joinedTimestamp
									? ` · <t:${Math.floor(m.joinedTimestamp / 1000)}:R>`
									: "";
								return `${m}${bot}\n-# \`${m.user.tag}\`${joined}`;
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
