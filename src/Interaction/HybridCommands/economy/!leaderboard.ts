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
	AttachmentBuilder
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
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		if (
			(await client.db.get(`${interaction.guildId}.ECONOMY.disabled`)) ===
			true
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.economy_disable_msg.replace(
					"${authorId}",
					interaction.member.user.id
				)
			});
			return;
		}

		const char = (await client.db.get(
			`${interaction.guildId}.USER`
		)) as DatabaseStructure.DbGuildUserObject;
		const array: {
			user: User;
			totalWealth: number;
			bank: number;
			money: number;
		}[] = [];

		for (const i in char) {
			const user = interaction.client.users.cache.get(i);
			const economy = char[i].ECONOMY;
			if (!user || !economy) continue;
			array.push({
				user: user,
				totalWealth: (economy.bank || 0) + (economy.money || 0),
				bank: economy.bank || 0,
				money: economy.money || 0
			});
		}

		if (array.length === 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.perm_list_no_user
			});
			return;
		}

		array.sort((a, b) => b.totalWealth - a.totalWealth);

		const itemsPerPage = 10;
		const totalPages = Math.ceil(array.length / itemsPerPage);

		const createEmbed = async (page: number) => {
			const startIndex = page * itemsPerPage;
			const endIndex = startIndex + itemsPerPage;
			const pageUsers = array.slice(startIndex, endIndex);

			const embed = new EmbedBuilder()
				.setTitle(
					lang.economy_leaderboard_embed_title.replace(
						"${guildName}",
						interaction.guild!.name
					)
				)
				.setColor("#ffd700")
				.setImage("attachment://image.png")
				.setDescription(
					pageUsers
						.map((entry, index) => {
							const globalIndex = startIndex + index;
							const medal =
								globalIndex === 0
									? "🥇"
									: globalIndex === 1
										? "🥈"
										: globalIndex === 2
											? "🥉"
											: "💰";

							return `${medal} **${globalIndex + 1}** ・ ${entry.user?.toString()}\n  ┖ ${client.iHorizon_Emojis.Coin} **${formatNumber(entry.bank)}** (${lang.balance_embed_fields1_name}) + **${formatNumber(entry.money)}** (${lang.balance_embed_fields2_name})`;
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

		// The coin is a Discord custom emoji (<:Coin:id>): draw its image
		// (the HTML printed the raw markup).
		const coinId = client.iHorizon_Emojis.Coin.match(/:(\d+)>$/)?.[1];
		const podium = array.slice(0, 3);
		const [badgeIcon, entries] = await Promise.all([
			fetchAvatar(
				coinId
					? `https://cdn.discordapp.com/emojis/${coinId}.png?size=64`
					: null
			),
			Promise.all(
				podium.map(async (entry) => ({
					name: entry.user.username || lang.profil_unknown,
					avatar: await fetchAvatar(
						entry.user.displayAvatarURL({
							extension: "png",
							size: 128
						})
					),
					badge: formatNumber(entry.totalWealth || 0)
				}))
			)
		]);
		const image = await renderPodium({
			title: lang.economy_leaderboard_embed_title.replace(
				"`${guildName}`",
				interaction.guild.name + " "
			),
			badgeColors: ["#ffd700", "#b8860b"],
			badgeIcon,
			entries
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
