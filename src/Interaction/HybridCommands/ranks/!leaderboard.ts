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
	EmbedBuilder,
	ChatInputCommandInteraction,
	Message,
	User,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	AttachmentBuilder,
	MessageFlags
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";
import { SubCommand } from "../../../../types/command.js";
import formatNumber from "../../../core/functions/numberBeautifuer.js";
import { renderPodium } from "../../../core/modules/podiumCard.js";
import { fetchAvatar } from "../../../core/modules/statsPage.js";

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

		// Fetch user data
		const char = (await client.db.get(
			`${interaction.guildId}.USER`
		)) as DatabaseStructure.DbGuildUserObject;
		const array: {
			user: User;
			level: number;
			xptotal: number;
			xp: number;
		}[] = [];

		for (const i in char) {
			const a = char[i].XP_LEVELING!;
			const user = interaction.client.users.cache.get(i);
			if (!user || !a) continue;
			array.push({
				user: user,
				level: a.level || 0,
				xptotal: a.xptotal || 0,
				xp: a.xp || 0
			});
		}

		if (array.length === 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.perm_list_no_user
			});
			return;
		}

		// Sort array by total XP in descending order
		array.sort((a, b) => b.xptotal - a.xptotal);

		// Pagination setup
		const itemsPerPage = 10;
		const totalPages = Math.ceil(array.length / itemsPerPage);

		const createEmbed = async (page: number) => {
			const startIndex = page * itemsPerPage;
			const endIndex = startIndex + itemsPerPage;
			const pageUsers = array.slice(startIndex, endIndex);

			const embed = new EmbedBuilder()
				.setTitle(lang.ranks_leaderboard_embed_title)
				.setColor("#ffc6fa")
				.setImage("attachment://image.png")
				.setDescription(
					pageUsers
						.map((entry, index) => {
							const globalIndex = startIndex + index;

							if (globalIndex === 0) {
								return `\`🥇 \` **${globalIndex + 1}** ・ ${entry.user?.toString()}\n  ┖  ${lang.var_level} **${entry?.level}** (**${entry?.xptotal}** XP)`;
							}
							if (globalIndex === 1) {
								return `\`🥈 \` **${globalIndex + 1}** ・ ${entry.user?.toString()}\n  ┖  ${lang.var_level} **${entry?.level}** (**${entry?.xptotal}** XP)`;
							}
							if (globalIndex === 2) {
								return `\`🥉 \` **${globalIndex + 1}** ・ ${entry.user?.toString()}\n  ┖  ${lang.var_level} **${entry?.level}** (**${entry?.xptotal}** XP)`;
							}

							return `\`💠 \` **${globalIndex + 1}** ・ ${entry.user?.toString()}\n  ┖  ${lang.var_level} **${entry?.level}** (**${entry?.xptotal}** XP)`;
						})
						.join("\n")
				)
				.setFooter(
					await client.func.displayBotName.footerPaginationBuilder(
						interaction.guildId!,
						lang,
						page + 1,
						totalPages
					)
				)
				.setTimestamp();

			return embed;
		};

		const podium = array.slice(0, 3);
		const image = await renderPodium({
			title: lang.ranks_leaderboard_embed_title.replace(
				"${interaction.guild?.name}",
				interaction.guild.name
			),
			badgeColors: ["#22c55e", "#16a34a"],
			entries: await Promise.all(
				podium.map(async (entry) => ({
					name: entry.user.username || lang.profil_unknown,
					subtitle: lang.ranks_config_var_level.replace(
						"{level}",
						entry.level.toString()
					),
					avatar: await fetchAvatar(
						entry.user.displayAvatarURL({
							extension: "png",
							size: 128
						})
					),
					badge: `${formatNumber(entry.xptotal)} XP`
				}))
			)
		});

		const attachment = new AttachmentBuilder(image, { name: "image.png" });

		const createButtons = (currentPage: number) => {
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId("first")
					.setLabel("<<<")
					.setStyle(ButtonStyle.Primary)
					.setDisabled(currentPage === 0),
				new ButtonBuilder()
					.setCustomId("previous")
					.setLabel("<")
					.setStyle(ButtonStyle.Primary)
					.setDisabled(currentPage === 0),
				new ButtonBuilder()
					.setCustomId("page_info")
					.setLabel(
						`${lang.var_page} ${currentPage + 1}/${totalPages}`
					)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(true),
				new ButtonBuilder()
					.setCustomId("next")
					.setLabel(">")
					.setStyle(ButtonStyle.Primary)
					.setDisabled(currentPage === totalPages - 1),
				new ButtonBuilder()
					.setCustomId("last")
					.setLabel(">>>")
					.setStyle(ButtonStyle.Primary)
					.setDisabled(currentPage === totalPages - 1)
			);

			return row;
		};

		let currentPage = 0;

		const message = await client.func.method.interactionSend(interaction, {
			embeds: [await createEmbed(currentPage)],
			components: [createButtons(currentPage)],
			files: [
				await client.func.displayBotName.footerAttachmentBuilder(
					interaction
				),
				attachment
			]
		});

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 60_000 * 15
		});

		collector.on("collect", async (buttonInteraction) => {
			if (
				buttonInteraction.member?.user.id !==
				interaction.member?.user.id
			) {
				await buttonInteraction.reply({
					content: lang.help_not_for_you,
					flags: [MessageFlags.Ephemeral]
				});
				return;
			}

			if (!buttonInteraction.isButton()) return;

			switch (buttonInteraction.customId) {
				case "first":
					currentPage = 0;
					break;
				case "previous":
					if (currentPage > 0) currentPage--;
					break;
				case "next":
					if (currentPage < totalPages - 1) currentPage++;
					break;
				case "last":
					currentPage = totalPages - 1;
					break;
			}

			await buttonInteraction.update({
				embeds: [await createEmbed(currentPage)],
				components: [createButtons(currentPage)]
			});
		});

		collector.on("end", async () => {
			await message.edit({
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId("first")
							.setLabel("<<<")
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(true),
						new ButtonBuilder()
							.setCustomId("previous")
							.setLabel("<")
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(true),
						new ButtonBuilder()
							.setCustomId("page_info")
							.setLabel(
								`${lang.var_page} ${currentPage + 1}/${totalPages}`
							)
							.setStyle(ButtonStyle.Primary)
							.setDisabled(true),
						new ButtonBuilder()
							.setCustomId("next")
							.setLabel(">")
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(true),
						new ButtonBuilder()
							.setCustomId("last")
							.setLabel(">>>")
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(true)
					)
				]
			});
		});

		return;
	}
};
