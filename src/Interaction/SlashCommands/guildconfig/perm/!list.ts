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
	Client,
	ChatInputCommandInteraction,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle
} from "discord.js";
import { LanguageData } from "../../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../../types/database_structure.js";
import { SubCommand } from "../../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	cardPayload,
	pageLabel
} from "../../../../core/modules/uiCard.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached">,
		lang: LanguageData
	) => {
		if (
			!interaction.member ||
			!client.user ||
			!interaction.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const all_members: DatabaseStructure.UtilsPermsUserData =
			(await client.db.get(`${interaction.guildId}.UTILS.USER_PERMS`)) ||
			{};
		const all_roles: DatabaseStructure.UtilsRoleData =
			(await client.db.get(`${interaction.guildId}.UTILS.roles`)) || {};
		const allUsers: { group: number; userId: string }[] = [];

		Object.entries(all_roles).forEach(([perm, userId]) => {
			allUsers.push({ userId, group: parseInt(perm) });
		});

		Object.entries(all_members).forEach(([userId, perm]) => {
			allUsers.push({ userId, group: perm });
		});

		const itemsPerPage = 10;
		let currentPage = 0;
		const totalPages = Math.max(
			1,
			Math.ceil(allUsers.length / itemsPerPage)
		);

		const signature = await botSignature(client, interaction.guildId);

		const generateEmbed = async (page: number) => {
			const startIndex = page * itemsPerPage;
			const endIndex = Math.min(
				startIndex + itemsPerPage,
				allUsers.length
			);

			const groupedUsers: { [key: number]: string[] } = {};

			for (let i = startIndex; i < endIndex; i++) {
				const { group, userId } = allUsers[i];
				const user =
					interaction.guild.roles.cache.get(userId)?.toString() ||
					interaction.guild.members.cache.get(userId)?.toString();

				if (!groupedUsers[group]) {
					groupedUsers[group] = [];
				}
				if (user) {
					groupedUsers[group].push(user);
				}
			}

			const blocks = Object.entries(groupedUsers).map(
				([group, users]) =>
					`**${lang.guildconfig_perm_level.replace("${level}", group)}**\n${users.join("\n") || lang.perm_list_no_user}`
			);

			const container = buildCard({
				accent: ACCENT.neutral,
				emoji: client.iHorizon_Emojis.Crown,
				title: lang.perm_list_embed_title,
				description: blocks.length ? null : lang.perm_list_no_user,
				blocks,
				signature,
				footer: pageLabel(lang, page, totalPages)
			});
			container.addActionRowComponents(generateButtons(page));
			return container;
		};

		const generateButtons = (page: number) => {
			return new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId("previous")
					.setLabel("<<<")
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(page === 0),
				new ButtonBuilder()
					.setCustomId("next")
					.setLabel(">>>")
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(page === totalPages - 1)
			);
		};

		const message = await client.func.method.interactionSend(interaction, {
			...cardPayload(await generateEmbed(currentPage)),
			withResponse: true
		} as never);

		const collector = message.createMessageComponentCollector({
			time: 60_000 * 5
		});

		collector.on("collect", async (i) => {
			if (i.customId === "previous") {
				currentPage--;
			} else if (i.customId === "next") {
				currentPage++;
			}

			await i.update(
				cardPayload(await generateEmbed(currentPage)) as never
			);
		});

		collector.on("end", async () => {
			// Same card without the buttons.
			const container = await generateEmbed(currentPage);
			container.spliceComponents(-1, 1);
			await message
				.edit(cardPayload(container) as never)
				.catch(() => null);
		});
	}
};
